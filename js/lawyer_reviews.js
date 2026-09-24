// ==========================================
// 1. STATE & INITIALIZATION
// ==========================================
let reviews = [];
let currentFilter = 'all';

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) {
        const user = Auth.getUser();
        if (user.role !== 'lawyer') {
            await window.showBSAlert('แจ้งเตือน', 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 'warning');
            window.location.href = '/';
            return;
        }

        // Fetch reviews from API
        try {
            const profileRes = await fetch(`/lawyers/${user.id}/edit`);
            if (profileRes.ok) {
                const pData = await profileRes.json();
                const p = pData.profile;
                if (p.status === 'pending') {
                    const mainContent = document.querySelector('main');
                    if (mainContent) {
                        mainContent.innerHTML = `
                            <div class="d-flex align-items-center justify-content-center" style="min-height: 100vh; background-color: #f8f9fa;">
                                <div class="card border-0 shadow-sm rounded-4 p-5 text-center" style="max-width: 500px; width: 90%;">
                                    <i class="fa-solid fa-clock-rotate-left fa-4x text-warning mb-4"></i>
                                    <h4 class="fw-bold mb-3">บัญชีของคุณอยู่ระหว่างรอตรวจสอบ</h4>
                                    <p class="text-muted mb-0">กรุณารอแอดมินตรวจสอบข้อมูลของคุณ <br>หากได้รับการอนุมัติแล้ว ถึงจะสามารถใช้งานระบบได้</p>
                                </div>
                            </div>
                        `;
                    }
                    document.querySelectorAll('.sidebar-nav-list a').forEach(a => {
                        a.style.pointerEvents = 'none';
                        a.style.opacity = '0.5';
                    });

                    return;
                }
                if (p.status === 'rejected') {
                    const mainContent = document.querySelector('main');
                    if (mainContent) {
                        mainContent.innerHTML = `
                            <div class="d-flex align-items-center justify-content-center" style="min-height: 100vh; background-color: #f8f9fa;">
                                <div class="card border-0 shadow-sm rounded-4 p-5 text-center" style="max-width: 500px; width: 90%;">
                                    <i class="fa-solid fa-circle-xmark fa-4x text-danger mb-4"></i>
                                    <h3 class="fw-bold mb-3">คำร้องขอของคุณไม่ผ่านการอนุมัติ</h3>
                                    <p class="text-danger mb-4">เหตุผล: ${p.reject_reason || 'ไม่ระบุ'}</p>
                                    <p class="text-muted mb-4">กรุณาไปที่หน้า "แก้ไขข้อมูลส่วนตัว" เพื่อทำการอัปเดตข้อมูลให้ถูกต้อง</p>
                                    <a href="/lawyer_edit" class="btn btn-primary px-4 rounded-pill">ไปหน้าแก้ไขข้อมูล</a>
                                </div>
                            </div>
                        `;
                    }
                    document.querySelectorAll('.sidebar-nav-list a').forEach(a => {
                        if(!a.href.includes('/lawyer_edit')) {
                            a.style.pointerEvents = 'none';
                            a.style.opacity = '0.5';
                        }
                    });
                    window.showBSAlert('ต้องแก้ไขข้อมูล', 'กรุณาแก้ไขข้อมูลตามที่แอดมินแจ้ง', 'error');
                    return;
                }
            }

            const res = await fetch(`/lawyers/${user.id}/reviews`);
            if (res.ok) {
                const data = await res.json();
                reviews = data.map(r => ({
                    id: r.id,
                    userName: `${r.user_first || ''} ${r.user_last || ''}`.trim() || 'นิรนาม',
                    userAvatar: r.user_image || null,
                    date: new Date(r.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
                    rating: r.rating,
                    comment: r.comment,
                    reply: r.reply || null,
                    replied_at: r.replied_at || null,
                    status: r.status
                }));
            }
        } catch (err) {
            console.error('Error fetching reviews:', err);
        }
    } else {
        await window.showBSAlert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อน', 'warning');
        window.location.href = '/sign_in';
        return;
    }

    updateReviewSummary();
    renderReviews();
});

// ==========================================
// 2. RENDERING LOGIC
// ==========================================

function updateReviewSummary() {
    const total = reviews.length;
    let sum = 0;
    let counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    reviews.forEach(r => {
        sum += r.rating;
        counts[r.rating] = (counts[r.rating] || 0) + 1;
    });
    
    const avg = total > 0 ? (sum / total).toFixed(1) : '0.0';
    
    const avgRatingDisplay = document.getElementById('avgRatingDisplay');
    const totalReviewsDisplay = document.getElementById('totalReviewsDisplay');
    const avgStarsDisplay = document.getElementById('avgStarsDisplay');
    
    if (avgRatingDisplay) avgRatingDisplay.textContent = avg;
    if (totalReviewsDisplay) totalReviewsDisplay.textContent = `จาก ${total} รีวิว`;
    
    if (avgStarsDisplay) {
        let starsHtml = '';
        const fullStars = Math.floor(avg);
        const hasHalfStar = (avg - fullStars) >= 0.5;
        
        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                starsHtml += '<i class="fa-solid fa-star"></i> ';
            } else if (i === fullStars + 1 && hasHalfStar) {
                starsHtml += '<i class="fa-solid fa-star-half-stroke"></i> ';
            } else {
                starsHtml += '<i class="fa-regular fa-star text-muted opacity-50"></i> ';
            }
        }
        avgStarsDisplay.innerHTML = starsHtml;
    }
    
    for (let i = 1; i <= 5; i++) {
        const countDisplay = document.getElementById(`count${i}`);
        const barDisplay = document.getElementById(`bar${i}`);
        if (countDisplay) countDisplay.textContent = counts[i];
        if (barDisplay) {
            const percent = total > 0 ? (counts[i] / total) * 100 : 0;
            barDisplay.style.width = `${percent}%`;
            barDisplay.setAttribute('aria-valuenow', percent);
        }
    }
}


// Render Reviews based on current filter
function renderReviews() {
    const container = document.getElementById('reviewsContainer');
    container.innerHTML = '';
    
    let filteredReviews = reviews.filter(review => {
        if (currentFilter === 'all') return true;
        if (currentFilter === 'need-reply') return review.reply === null;
        if (currentFilter === '5') return review.rating === 5;
        if (currentFilter === '4') return review.rating === 4;
        if (currentFilter === '1-3') return review.rating >= 1 && review.rating <= 3;
        return true;
    });

    const sortSelect = document.getElementById('reviewSortSelect');
    const sortVal = sortSelect ? sortSelect.value : 'newest';

    if (sortVal === 'newest') {
        filteredReviews = [...filteredReviews].sort((a, b) => b.id - a.id);
    } else if (sortVal === 'oldest') {
        filteredReviews = [...filteredReviews].sort((a, b) => a.id - b.id);
    } else if (sortVal === 'rating-high') {
        filteredReviews = [...filteredReviews].sort((a, b) => b.rating - a.rating);
    } else if (sortVal === 'rating-low') {
        filteredReviews = [...filteredReviews].sort((a, b) => a.rating - b.rating);
    }

    if (filteredReviews.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fa-solid fa-inbox fs-1 mb-3 d-block"></i>
                <p>ไม่พบรีวิว</p>
            </div>
        `;
        return;
    }

    filteredReviews.forEach(review => {
        // Determine rating class for left border color
        let ratingClass = 'rating-5';
        if(review.rating === 4) ratingClass = 'rating-4';
        if(review.rating <= 3) ratingClass = 'rating-low';

        // Generate stars HTML
        let starsHtml = '';
        for(let i = 1; i <= 5; i++) {
            if(i <= review.rating) {
                starsHtml += '<i class="fa-solid fa-star text-warning"></i> ';
            } else {
                starsHtml += '<i class="fa-regular fa-star text-muted opacity-50"></i> ';
            }
        }

        // Generate Reply Section or Reply Button
        let replyHtml = '';
        if (review.reply) {
            let lawyerNameStr = 'ทนายความ';
            if (typeof Auth !== 'undefined') {
                const user = Auth.getUser();
                if (user && user.first_name) {
                    lawyerNameStr = user.first_name + ' ' + (user.last_name || '');
                }
            }
            if (review.status === 'reported') {
                lawyerNameStr += ' <span class="badge bg-warning-subtle text-warning-emphasis ms-2"><i class="fa-solid fa-clock-rotate-left me-1"></i>รอการตรวจสอบ</span>';
            }
            const repliedAt = review.replied_at ? new Date(review.replied_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
            
            replyHtml = `
                <div class="mt-3 p-3 bg-light rounded-4 border-0">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div class="d-flex align-items-center">
                            <i class="fa-solid fa-reply fa-rotate-180 text-dark me-2" style="font-size: 1.1rem;"></i>
                            <span class="fw-bold text-dark">${lawyerNameStr}</span>
                        </div>
                        <small class="text-muted" style="font-size: 0.85rem;">${repliedAt}</small>
                    </div>
                    <div class="review-text-container d-flex flex-column align-items-start w-100" style="padding-left: 1.8rem;">
                        <p class="mb-1 text-dark review-comment-text text-clamp-2 w-100 text-start" style="font-size: 0.95rem; word-break: break-all;">${review.reply}</p>
                        <a href="javascript:void(0)" class="text-dark text-decoration-none fw-bold small read-more-btn" style="display: none;">เพิ่มเติม</a>
                    </div>
                </div>
            `;
        } else if (review.status === 'reported') {
            replyHtml = `
                <div class="alert alert-warning d-flex align-items-center mt-4 border-0" style="background-color: #fff3cd; border-radius: 12px;">
                    <i class="fa-solid fa-clock-rotate-left fs-4 me-3 text-warning"></i>
                    <div>
                        <div class="fw-bold text-warning-emphasis">รีวิวนี้ถูกรายงานแล้ว</div>
                        <small class="text-warning-emphasis">กำลังอยู่ระหว่างการตรวจสอบโดยผู้ดูแลระบบ</small>
                    </div>
                </div>
            `;
        } else {
            replyHtml = `
                <div class="d-flex justify-content-start mt-2">
                    <button class="btn btn-link text-decoration-none p-0 fw-bold text-dark" style="font-size: 0.95rem;" onclick="toggleReplyBox(${review.id})">
                        <i class="fa-solid fa-reply me-1"></i>ตอบกลับ
                    </button>
                </div>
                <div id="replyBoxContainer-${review.id}" class="mt-2 p-3 rounded-4" style="display: none; background-color: #f8fafc; border: 1px solid #e2e8f0;">
                    <textarea class="form-control bg-white text-dark border p-3 mb-2" id="inlineReply-${review.id}" rows="1" placeholder="พิมพ์ข้อความตอบกลับที่นี่..." style="border-radius: 12px; resize: none; overflow: hidden;" oninput="this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px';"></textarea>
                      <div class="d-flex justify-content-between align-items-center">
                          <i class="fa-regular fa-flag text-muted fs-5" title="รายงานความไม่เหมาะสม" style="cursor: pointer; transition: 0.2s;" onmouseover="this.classList.replace('text-muted', 'text-danger'); 
                            this.classList.replace('fa-regular', 'fa-solid')" onmouseout="this.classList.replace('text-danger', 'text-muted'); this.classList.replace('fa-solid', 'fa-regular')" onclick="reportReview(${review.id}, '${review.status}')">
                          </i>
                          <button class="btn rounded-pill px-4 text-white" style="background-color: #4987A4; font-size: 1rem;" onclick="submitInlineReply(${review.id})">
                            ส่ง
                        </button>
                    </div>
                </div>
            `;
        }

          const imgHTML = review.userAvatar 
              ? `<img src="${review.userAvatar}" alt="${review.userName}" class="review-user-avatar">`
              : `<div class="d-flex justify-content-center align-items-center bg-light review-user-avatar"><i class="fa-solid fa-user" style="font-size: 24px; color: #dee2e6;"></i></div>`;

          const reviewHtml = `
              <div class="review-item ${ratingClass}" id="review-${review.id}">
                  <div class="d-flex justify-content-between align-items-start mb-3">
                      <div class="d-flex align-items-center gap-3">
                          ${imgHTML}
                        <div>
                            <h6 class="mb-0 fw-bold">${review.userName}</h6>
                            <small class="text-muted">${review.date}</small>
                        </div>
                    </div>
                    <div class="fs-5">
                        ${starsHtml}
                    </div>
                </div>
                <div class="review-text-container d-flex flex-column align-items-start w-100 mt-2">
                    <p class="mb-0 review-comment-text text-clamp-2 w-100 text-start text-dark" style="font-size: 0.95rem; word-break: break-all;">${review.comment}</p>
                    <a href="javascript:void(0)" class="text-dark text-decoration-none fw-bold small read-more-btn" style="display: none;">เพิ่มเติม</a>
                </div>
                ${replyHtml}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', reviewHtml);
    });

    // Setup Read More buttons
    const textContainers = container.querySelectorAll('.review-text-container');
    textContainers.forEach(textContainer => {
        const p = textContainer.querySelector('.review-comment-text');
        const btn = textContainer.querySelector('.read-more-btn');
        if (p && btn && p.scrollHeight > p.clientHeight) {
            btn.style.display = 'inline-block';
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent card click
                if (p.classList.contains('text-clamp-2')) {
                    p.classList.remove('text-clamp-2');
                    textContainer.classList.add('expanded');
                    btn.innerText = 'ซ่อน';
                } else {
                    p.classList.add('text-clamp-2');
                    textContainer.classList.remove('expanded');
                    btn.innerText = 'เพิ่มเติม';
                }
            });
        }
    });
}

// ==========================================
// 3. ACTIONS & EVENT LISTENERS
// ==========================================

function toggleReplyBox(reviewId) {
    const box = document.getElementById(`replyBoxContainer-${reviewId}`);
    if (box) {
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }
}

// Filter function
function filterReviews(filterType) {
    currentFilter = filterType;
    
    // Update active button state
    document.querySelectorAll('.filter-pills .btn-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderReviews();
}

// Submit inline reply
async function submitInlineReply(reviewId) {
    const replyInput = document.getElementById(`inlineReply-${reviewId}`);
    if (!replyInput) return;
    
    const replyText = replyInput.value.trim();
    
    if (replyText === '') {
        window.showBSAlert('กรุณากรอกข้อความ', 'กรุณากรอกข้อความตอบกลับก่อนส่ง', 'warning');
        return;
    }
    
    if (replyText.length > 500) {
        window.showBSAlert('ข้อความยาวเกินไป', 'ข้อความตอบกลับยาวเกินไป (ไม่เกิน 500 ตัวอักษร)', 'warning');
        return;
    }

    const user = Auth.getUser();
    try {
        const res = await fetch(`/lawyers/${user.id}/reviews/${reviewId}/reply`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ reply: replyText })
        });
        
        if (res.ok) {
            const reviewIndex = reviews.findIndex(r => r.id === reviewId);
            if (reviewIndex !== -1) {
                reviews[reviewIndex].reply = replyText;
                renderReviews();
                window.showBSToast('ส่งตอบกลับสำเร็จ', 'success');
            }
        } else {
            const errData = await res.json();
            window.showBSAlert('เกิดข้อผิดพลาด', errData.error || 'ไม่สามารถตอบกลับได้', 'error');
        }
    } catch (err) {
        console.error(err);
        window.showBSAlert('เกิดข้อผิดพลาด', 'ไม่สามารถตอบกลับได้', 'error');
    }
}

// Report review function
function reportReview(reviewId, status) {
    if (status === 'reported') {
        window.showBSAlert('แจ้งเตือน', 'เนื้อหานี้ถูกรายงานไปแล้วและกำลังรอการตรวจสอบจากผู้ดูแลระบบ', 'warning');
        return;
    }
    document.getElementById('reportReviewId').value = reviewId;
    document.getElementById('reportTarget').value = 'review';
    document.getElementById('reportReason').value = '';
    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    modal.show();
}

// Global report form submit listener
document.addEventListener('DOMContentLoaded', () => {
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const reviewId = document.getElementById('reportReviewId').value;
            const target = document.getElementById('reportTarget').value;
            const reason = document.getElementById('reportReason').value;
            
            if (!reason) {
                await window.showBSAlert('แจ้งเตือน', 'กรุณาเลือกเหตุผลที่ต้องการรายงาน', 'warning');
                return;
            }

            try {
                const res = await fetch(`/reviews/${reviewId}/report`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Auth.getToken()}`
                    },
                    body: JSON.stringify({
                        target: target,
                        flagReason: reason
                    })
                });

                if (res.ok) {
                    window.showBSToast('ส่งคำร้องขอรายงานรีวิวสำเร็จ ทางผู้ดูแลระบบจะรับเรื่องเพื่อตรวจสอบต่อไป', 'success');
                    
                    const revIndex = reviews.findIndex(r => r.id == reviewId);
                    if (revIndex !== -1) {
                        reviews[revIndex].status = 'reported';
                        renderReviews();
                    }
                    
                    const modalEl = document.getElementById('reportModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                    
                    reportForm.reset();
                } else {
                    const errData = await res.json();
                    await window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาด: ' + (errData.error || 'ไม่สามารถส่งรายงานได้'), 'error');
                }
            } catch (err) {
                console.error("Error submitting report:", err);
                await window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
            }
        });
    }
});
