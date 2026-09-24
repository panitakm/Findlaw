document.addEventListener('DOMContentLoaded', () => {
    initReviewsPage();
});

let userReviews = [];
let userId = null;
let editingReviewId = null;
let currentSelectedRating = 5;
let reviewIdToDelete = null;

async function initReviewsPage() {
    const authUser = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    if (authUser) {
        if (authUser.role !== 'user') {
            await window.showBSAlert('ปฏิเสธการเข้าถึง', 'หน้านี้สำหรับผู้ใช้งานทั่วไปเท่านั้น', 'error');
            window.location.href = '/';
            return;
        }
        userId = authUser.id;
    } else {
        await window.showBSAlert('ปฏิเสธการเข้าถึง', 'กรุณาเข้าสู่ระบบก่อน', 'error');
        window.location.href = '/sign_in';
        return;
    }

    await fetchUserReviews();
    updateReviewStats();
    setupFilters();
    setupStarRatingPicker();
    setupEditFormSubmit();
}

async function fetchUserReviews() {
    try {
        const res = await fetch(`/users/${userId}/reviews`);
        if (res.ok) {
            userReviews = await res.json();
            userReviews = userReviews.map(r => ({
                id: r.id,
                lawyer_id: r.lawyer_id,
                lawyer_name: r.lawyer_first + " " + r.lawyer_last,
                lawyer_avatar: r.lawyer_image || null,
                specialty: "", // Add if fetched
                rating: r.rating,
                created_at: new Date(r.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
                title: r.title || `ให้คะแนน ${r.rating} ดาว`,
                comment: r.comment,
                helpful_count: r.helpful_count || 0,
                reply_text: r.reply || r.reply_text || null,
                reply_date: (r.replied_at || r.reply_date) ? new Date(r.replied_at || r.reply_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : null
            }));
        } else {
            userReviews = [];
        }
        renderReviewsList(userReviews);
    } catch (err) {
        console.error("Error fetching reviews:", err);
        userReviews = [];
        renderReviewsList(userReviews);
    }
}

function updateReviewStats() {
    const totalEl = document.getElementById('totalReviewsCount');
    const avgEl = document.getElementById('avgRatingCount');
    const helpfulEl = document.getElementById('totalHelpfulCount');

    if (totalEl) totalEl.textContent = userReviews.length;
    
    if (avgEl) {
        if (userReviews.length > 0) {
            const sum = userReviews.reduce((acc, r) => acc + r.rating, 0);
            avgEl.textContent = (sum / userReviews.length).toFixed(1);
        } else {
            avgEl.textContent = '0.0';
        }
    }

    if (helpfulEl) {
        const helpfulSum = userReviews.reduce((acc, r) => acc + r.helpful_count, 0);
        helpfulEl.textContent = helpfulSum;
    }
}

function renderReviewsList(reviews) {
    const container = document.getElementById('reviewsContainer');
    if (!container) return;

    if (reviews.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="card border-0 shadow-sm rounded-4 p-5 mx-auto" style="max-width: 500px;">
                    <div class="text-muted mb-3">
                        <i class="fa-solid fa-star text-secondary" style="font-size: 3rem;"></i>
                    </div>
                    <h4 class="fw-bold mb-4" style="color: #1a4252;">ยังไม่มีประวัติการรีวิว</h4>
                    <div>
                        <a href='/favorites' class="btn text-white rounded-pill shadow-sm px-4 py-2" style="background-color: #4987a4; font-size: 1.1rem; border: none; font-weight: 500;">
                            <i class="fa-solid fa-bookmark me-2"></i>ไปที่ทนายความที่บันทึกไว้
                        </a>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const authUser = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    const userName = authUser && authUser.first_name ? (authUser.first_name + " " + authUser.last_name) : "ผู้ใช้งาน";
    const userAvatar = authUser && authUser.image_path 
        ? `<img src="${authUser.image_path}" class="rounded-circle object-fit-cover" width="44" height="44" style="border:2px solid #e8edf5;">` 
        : `<div class="review-avatar-circle">${userName.charAt(0)}</div>`;

    container.innerHTML = reviews.map(review => {
        // Lawyer initial circle or image
        const lawyerAvatarEl = review.lawyer_avatar
            ? `<img src="${review.lawyer_avatar}" class="rounded-circle object-fit-cover" width="36" height="36" style="border:2px solid #dbeafe;">`
            : `<div class="review-avatar-circle review-avatar-circle-sm">${review.lawyer_name.charAt(0)}</div>`;

        let commentHtml = review.comment 
            ? `<div class="review-text-container d-flex flex-column align-items-start w-100">
                   <p class="mb-0 review-comment-text text-clamp-2 w-100 text-start ps-2 mt-2">${review.comment}</p>
                   <a href="javascript:void(0)" class="text-dark text-decoration-none fw-bold small read-more-btn" style="display: none;">ดูเพิ่มเติม</a>
               </div>` 
            : `<p class="mb-0 fst-italic review-comment-text" style="color:#94a3b8; font-size: 1.1rem;">ให้คะแนนโดยไม่มีความคิดเห็น</p>`;

        let replyHtml = '';
        if (review.reply_text) {
            replyHtml = `
                <div class="review-reply-box mt-4">
                    <div class="d-flex align-items-start gap-2 mb-0">
                        <i class="fa-solid fa-reply fa-rotate-180 review-reply-icon flex-shrink-0 mt-1 ps-2"></i>${lawyerAvatarEl}
                        <div>
                            <div class="fw-semibold reply-name">${review.lawyer_name}</div>
                            <div class="reply-date">${review.reply_date || ''}</div>
                        </div>
                    </div>
                    <div class="review-text-container d-flex flex-column align-items-start w-100" style="padding-left: 78px;">
                        <p class="mb-0 review-comment-text text-clamp-2 w-100 text-start mt-3" style="word-break: break-all;">${review.reply_text}</p>
                        <a href="javascript:void(0)" class="text-dark text-decoration-none fw-bold small read-more-btn" style="display: none;">ดูเพิ่มเติม</a>
                    </div>
                </div>
            `;
        }

        return `
        <div class="mb-3" id="review-card-${review.id}">
            <div class="review-card p-4 cursor-pointer" onclick="window.location.href='/lawyer_profile?id=${review.lawyer_id}'">
                <div class="d-flex align-items-start gap-2 mb-0"> ${userAvatar}
                    <div class="flex-grow-1 min-w-0">
                        <div class="d-flex justify-content-between align-items-start gap-2">
                            <div>
                                <div class="fw-semibold" style="font-size:1.1rem; color:#1A435A;">${userName}</div>
                                <span class="review-lawyer-badge mt-1">ถึง ${review.lawyer_name}</span>
                            </div>
                            <div class="text-end flex-shrink-0">
                                <div class="review-stars" style="font-size:1rem;">${getStarRatingHTML(review.rating)}</div>
                                <div class="review-date">${review.created_at}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Divider -->
                <hr class="review-divider">

                <!-- Comment -->
                <div class="text-center mb-1 mt-3">
                    ${commentHtml}
                </div>

                <!-- Reply -->
                ${replyHtml}

                <!-- Delete button -->
                <div class="d-flex justify-content-end mt-3">
                    <button type="button" class="review-delete-btn bg-transparent border-0 p-0" onclick="event.stopPropagation(); confirmDeleteReview(${review.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');

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
                    btn.innerText = 'ย่อข้อความ';
                } else {
                    p.classList.add('text-clamp-2');
                    textContainer.classList.remove('expanded');
                    btn.innerText = 'ดูเพิ่มเติม';
                }
            });
        }
    });
}

function getStarRatingHTML(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fa-solid fa-star text-warning"></i>';
        } else {
            stars += '<i class="fa-regular fa-star text-muted opacity-25"></i>';
        }
    }
    return stars;
}

function setupFilters() {
    const ratingSelect = document.getElementById('reviewRatingSelect');
    const sortSelect = document.getElementById('reviewSortSelect');

    const filterFn = () => {
        const ratingVal = ratingSelect ? ratingSelect.value : '';
        const sortVal = sortSelect ? sortSelect.value : 'newest';

        let filtered = userReviews.filter(r => {
            if (!ratingVal) return true;
            if (ratingVal === '5') return r.rating === 5;
            if (ratingVal === '4') return r.rating === 4;
            if (ratingVal === '1-3') return r.rating >= 1 && r.rating <= 3;
            return true;
        });

        if (sortVal === 'newest') {
            filtered = [...filtered].sort((a, b) => b.id - a.id);
        } else if (sortVal === 'oldest') {
            filtered = [...filtered].sort((a, b) => a.id - b.id);
        } else if (sortVal === 'rating-high') {
            filtered = [...filtered].sort((a, b) => b.rating - a.rating);
        } else if (sortVal === 'rating-low') {
            filtered = [...filtered].sort((a, b) => a.rating - b.rating);
        }

        renderReviewsList(filtered);
    };

    if (ratingSelect) ratingSelect.addEventListener('change', filterFn);
    if (sortSelect) sortSelect.addEventListener('change', filterFn);
    
    filterFn();
}

function setupStarRatingPicker() {
    const stars = document.querySelectorAll('#interactiveStars i');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const val = parseInt(this.getAttribute('data-value'), 10);
            currentSelectedRating = val;
            updateStarPickerDisplay(val);
        });
    });
}

function updateStarPickerDisplay(rating) {
    const stars = document.querySelectorAll('#interactiveStars i');
    stars.forEach(star => {
        const val = parseInt(star.getAttribute('data-value'), 10);
        if (val <= rating) {
            star.className = 'fa-solid fa-star text-warning';
        } else {
            star.className = 'fa-regular fa-star text-muted';
        }
    });
    document.getElementById('editRatingText').textContent = `${rating} ดาว`;
}

window.openEditReviewModal = function(id) {
    const review = userReviews.find(r => r.id === id);
    if (!review) return;

    editingReviewId = id;
    currentSelectedRating = review.rating;

    document.getElementById('editReviewModalLawyerName').textContent = review.lawyer_name;
    document.getElementById('editReviewTitle').value = review.title;
    document.getElementById('editReviewComment').value = review.comment;
    updateStarPickerDisplay(review.rating);

    const modal = new bootstrap.Modal(document.getElementById('editReviewModal'));
    modal.show();
};

function setupEditFormSubmit() {
    const form = document.getElementById('editReviewForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!editingReviewId) return;

        const titleVal = document.getElementById('editReviewTitle').value.trim();
        const commentVal = document.getElementById('editReviewComment').value.trim();

        if (!titleVal || !commentVal) {
            await window.showBSAlert('ข้อผิดพลาด', 'กรุณากรอกความคิดเห็นอย่างน้อย 1 ตัวอักษร', 'warning');
            return;
        }

        try {
            const res = await fetch(`/reviews/${editingReviewId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: currentSelectedRating, title: titleVal, comment: commentVal })
            });

            if (res.ok) {
                const index = userReviews.findIndex(r => r.id === editingReviewId);
                if (index !== -1) {
                    userReviews[index].rating = currentSelectedRating;
                    userReviews[index].title = titleVal;
                    userReviews[index].comment = commentVal;
                    userReviews[index].created_at = 'แก้ไขล่าสุด วันนี้';
        
                    updateReviewStats();
                    setupFilters();
        
                    const modalInstance = bootstrap.Modal.getInstance(document.getElementById('editReviewModal'));
                    if (modalInstance) modalInstance.hide();
        
                    // showToast('บันทึกการแก้ไขรีวิวเรียบร้อยแล้ว');
                }
            } else {
                await window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการแก้ไขข้อมูล', 'error');
            }
        } catch (err) {
            console.error(err);
            await window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
        }
    });
}

window.confirmDeleteReview = async function(id) {
    const confirmed = await window.showBSConfirm(
        'ยืนยันการลบ', 
        'คุณแน่ใจหรือไม่ว่าต้องการลบรีวิวนี้ ?', 
        'ลบ', 
        'ยกเลิก', 
        'btn-danger'
    );
    if (confirmed) {
        await executeDelete(id);
    }
};

async function executeDelete(id) {
    try {
        const res = await fetch(`/reviews/${id}`, { method: 'DELETE' });
        if (res.ok) {
            if (typeof showToast === 'function') {
                showToast('ลบรีวิวเรียบร้อยแล้ว');
            } else {
                await window.showBSAlert('สำเร็จ', 'ลบรีวิวเรียบร้อยแล้ว !', 'success');
            }
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            await window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบรีวิว', 'error');
        }
    } catch (err) {
        console.error(err);
        await window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
};

function showToast(message) {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'custom-toast';
        document.body.appendChild(toastContainer);
    }

    toastContainer.innerHTML = `
        <div class="toast align-items-center text-bg-dark border-0 show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body py-3 px-4">
                    <i class="fa-solid fa-circle-check text-success me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    setTimeout(() => {
        toastContainer.innerHTML = '';
    }, 3500);
}
