let reviews = [];
let currentFilter = 'all';

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) {
        const user = Auth.getUser();
        if (user.role !== 'lawyer') {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            window.location.href = '/search.html';
            return;
        }

        // Fetch reviews from API
        try {
            const res = await fetch(`http://localhost:3000/lawyers/${user.id}/reviews`);
            if (res.ok) {
                const data = await res.json();
                reviews = data.map(r => ({
                    id: r.id,
                    userName: `${r.user_first || ''} ${r.user_last || ''}`.trim() || 'นิรนาม',
                    userAvatar: r.user_image || "/css/pic/person-circle.svg",
                    date: new Date(r.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }),
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
        alert('กรุณาเข้าสู่ระบบก่อน');
        window.location.href = '/user/login.html';
        return;
    }

    updateReviewSummary();
    renderReviews();
    
    // removed char count logic for modal
});

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

    if (filteredReviews.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fa-solid fa-inbox fs-1 mb-3 d-block"></i>
                <p>ไม่พบรีวิวในหมวดหมู่นี้</p>
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
            const repliedAt = review.replied_at ? new Date(review.replied_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
            
            replyHtml = `
                <div class="mt-3 p-3 bg-light rounded-4 border-0">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div class="d-flex align-items-center">
                            <i class="fa-solid fa-reply fa-rotate-180 text-dark me-2" style="font-size: 1.1rem;"></i>
                            <span class="fw-bold text-dark">${lawyerNameStr}</span>
                        </div>
                        <small class="text-muted" style="font-size: 0.85rem;">${repliedAt}</small>
                    </div>
                    <div style="padding-left: 1.8rem;">
                        <p class="mb-1 text-dark" style="font-size: 0.95rem;">${review.reply}</p>
                    </div>
                </div>
            `;
        } else if (review.status === 'reported') {
            replyHtml = `
                <div class="alert alert-warning d-flex align-items-center mt-4 border-0" style="background-color: var(--bs-warning-bg-subtle); border-radius: 12px;">
                    <i class="fa-solid fa-clock-rotate-left fs-4 me-3 text-warning"></i>
                    <div>
                        <div class="fw-bold text-warning-emphasis">รีวิวนี้ถูกรายงานแล้ว</div>
                        <small class="text-warning-emphasis">กำลังอยู่ระหว่างการตรวจสอบโดยผู้ดูแลระบบ</small>
                    </div>
                </div>
            `;
        } else {
            replyHtml = `
                <div class="mt-4 p-3 bg-light rounded border">
                    <label for="inlineReply-${review.id}" class="form-label fw-bold" style="color: var(--text-color);"><i class="fa-solid fa-reply me-1"></i>ตอบกลับรีวิวนี้</label>
                    <textarea class="form-control bg-white text-dark border p-3 mb-2" id="inlineReply-${review.id}" rows="1" placeholder="พิมพ์ข้อความตอบกลับที่นี่..." style="border-radius: 12px; resize: none; overflow: hidden;" oninput="this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px';"></textarea>
                    <div class="d-flex justify-content-between align-items-center">
                        <button class="btn btn-outline-danger btn-sm" onclick="reportReview(${review.id})">
                            <i class="fa-solid fa-flag me-1"></i> รายงานความไม่เหมาะสม
                        </button>
                        <button class="btn btn-primary rounded-pill px-4" onclick="submitInlineReply(${review.id})">
                            ส่งข้อความตอบกลับ
                        </button>
                    </div>
                </div>
            `;
        }

        const reviewHtml = `
            <div class="review-item ${ratingClass}" id="review-${review.id}">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div class="d-flex align-items-center gap-3">
                        <img src="${review.userAvatar}" alt="${review.userName}" class="review-user-avatar">
                        <div>
                            <h6 class="mb-0 fw-bold">${review.userName}</h6>
                            <small class="text-muted">${review.date}</small>
                        </div>
                    </div>
                    <div class="fs-5">
                        ${starsHtml}
                    </div>
                </div>
                <div class="review-content">
                    ${review.comment}
                </div>
                ${replyHtml}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', reviewHtml);
    });
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
        Swal.fire({ icon: 'warning', title: 'กรุณากรอกข้อความ', text: 'กรุณากรอกข้อความตอบกลับก่อนส่ง' });
        return;
    }
    
    if (replyText.length > 500) {
        Swal.fire({ icon: 'warning', title: 'ข้อความยาวเกินไป', text: 'ข้อความตอบกลับยาวเกินไป (ไม่เกิน 500 ตัวอักษร)' });
        return;
    }

    const user = Auth.getUser();
    try {
        const res = await fetch(`http://localhost:3000/lawyers/${user.id}/reviews/${reviewId}/reply`, {
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
                Swal.fire({ icon: 'success', title: 'ส่งตอบกลับสำเร็จ', timer: 1500, showConfirmButton: false });
            }
        } else {
            const errData = await res.json();
            Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: errData.error || 'ไม่สามารถบันทึกข้อความตอบกลับได้' });
        }
    } catch (err) {
        console.error(err);
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถบันทึกข้อความตอบกลับได้' });
    }
}

// Report review function
function reportReview(reviewId) {
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
                alert("กรุณาเลือกเหตุผลที่ต้องการรายงาน");
                return;
            }

            try {
                const res = await fetch(`http://localhost:3000/reviews/${reviewId}/report`, {
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
                    Swal.fire({
                        icon: 'success',
                        title: 'สำเร็จ',
                        text: 'ส่งคำร้องขอรายงานรีวิวสำเร็จ ทางผู้ดูแลระบบจะรับเรื่องเพื่อตรวจสอบต่อไป',
                        timer: 3000,
                        showConfirmButton: false
                    });
                    
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
                    alert("เกิดข้อผิดพลาด: " + (errData.error || "ไม่สามารถส่งรายงานได้"));
                }
            } catch (err) {
                console.error("Error submitting report:", err);
                alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
            }
        });
    }
});
