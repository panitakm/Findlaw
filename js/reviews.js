document.addEventListener('DOMContentLoaded', () => {
    initReviewsPage();
});

let userReviews = [];
let userId = null;
let editingReviewId = null;
let currentSelectedRating = 5;

async function initReviewsPage() {
    const authUser = typeof Auth !== 'undefined' ? Auth.getUser() : null;
    if (authUser) {
        if (authUser.role !== 'user') {
            alert("หน้านี้สำหรับผู้ใช้งานทั่วไปเท่านั้น");
            window.location.href = '/index.html';
            return;
        }
        userId = authUser.id;
    } else {
        alert("กรุณาเข้าสู่ระบบก่อน");
        window.location.href = '/login.html';
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
        const res = await fetch(`http://localhost:3000/users/${userId}/reviews`);
        if (res.ok) {
            userReviews = await res.json();
            // Optional: map the properties to match the frontend expectations if needed
            userReviews = userReviews.map(r => ({
                id: r.id,
                lawyer_id: r.lawyer_id,
                lawyer_name: r.lawyer_first + " " + r.lawyer_last,
                lawyer_avatar: r.lawyer_image || "/css/pic/person-circle.svg",
                specialty: "", // Add if fetched
                rating: r.rating,
                created_at: new Date(r.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
                title: r.title || `ให้คะแนน ${r.rating} ดาว`,
                comment: r.comment,
                helpful_count: r.helpful_count || 0
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
                    <div class="text-warning mb-3">
                        <i class="fa-solid fa-star-half-stroke fs-1" style="font-size: 3.5rem;"></i>
                    </div>
                    <h4 class="fw-bold mb-2" style="color: #0A3D73;">ยังไม่มีประวัติการรีวิว</h4>
                    <p class="text-muted small mb-4">คุณยังไม่ได้เขียนรีวิวให้ทนายความท่านใด หรือไม่พบรีวิวที่ตรงกับเงื่อนไขการค้นหา</p>
                    <div>
                        <a href="/user/favorites.html" class="btn btn-primary rounded-pill px-4 py-2" style="background-color: #0A3D73;">
                            <i class="fa-solid fa-bookmark me-2"></i>ไปที่ทนายความที่บันทึกไว้
                        </a>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = reviews.map(review => `
        <div class="col-12 review-item" id="review-card-${review.id}">
            <div class="card review-card p-4 mb-3">
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-3 gap-3">
                    <div class="d-flex align-items-center gap-3">
                        <img src="${review.lawyer_avatar}" alt="${review.lawyer_name}" class="lawyer-avatar-sm">
                        <div>
                            <h5 class="fw-bold text-dark mb-0">${review.lawyer_name}</h5>
                            <span class="badge bg-light text-primary border rounded-pill px-2 py-1 small me-2">${review.specialty}</span>
                            <span class="text-muted small"><i class="fa-regular fa-clock me-1"></i>${review.created_at}</span>
                        </div>
                    </div>
                    
                    <div class="d-flex align-items-center gap-2">
                        <div class="text-warning me-2 fs-5">
                            ${getStarRatingHTML(review.rating)}
                        </div>
                        <span class="fw-bold fs-5 text-dark">${review.rating}.0</span>
                    </div>
                </div>

                <div class="bg-light rounded-3 p-3 mb-3">
                    <h6 class="fw-bold text-dark mb-2">${review.title}</h6>
                    <p class="text-muted mb-0" style="line-height: 1.6;">${review.comment}</p>
                </div>

                <div class="d-flex justify-content-end align-items-center pt-2">
                    <div class="d-flex gap-2">
                        <a href="/lawyerProfile.html?id=${review.lawyer_id}" class="btn btn-sm btn-outline-primary rounded-pill px-3">
                            <i class="fa-solid fa-circle-user me-1"></i>โปรไฟล์ทนาย
                        </a>
                        <button type="button" class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="confirmDeleteReview(${review.id})">
                            <i class="fa-solid fa-trash me-1"></i>ลบ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function getStarRatingHTML(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fa-solid fa-star"></i>';
        } else {
            stars += '<i class="fa-regular fa-star"></i>';
        }
    }
    return stars;
}

function setupFilters() {
    const searchInput = document.getElementById('reviewSearchInput');
    const ratingSelect = document.getElementById('reviewRatingSelect');

    const filterFn = () => {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const ratingVal = ratingSelect ? ratingSelect.value : '';

        const filtered = userReviews.filter(r => {
            const matchesQuery = !query ||
                r.lawyer_name.toLowerCase().includes(query) ||
                r.title.toLowerCase().includes(query) ||
                r.comment.toLowerCase().includes(query);

            const matchesRating = !ratingVal || r.rating === parseInt(ratingVal, 10);

            return matchesQuery && matchesRating;
        });

        renderReviewsList(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', filterFn);
    if (ratingSelect) ratingSelect.addEventListener('change', filterFn);
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
            alert('กรุณากรอกข้อมูลหัวข้อและความคิดเห็นให้ครบถ้วน');
            return;
        }

        try {
            const res = await fetch(`http://localhost:3000/reviews/${editingReviewId}`, {
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
        
                    showToast('บันทึกการแก้ไขรีวิวเรียบร้อยแล้ว');
                }
            } else {
                alert("เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
            }
        } catch (err) {
            console.error(err);
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        }
    });
}

window.confirmDeleteReview = async function(id) {
    if (confirm('คุณต้องการลบรีวิวนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
        try {
            const res = await fetch(`http://localhost:3000/reviews/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('ลบรีวิวเรียบร้อยแล้ว');
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                alert('เกิดข้อผิดพลาดในการลบรีวิว');
            }
        } catch (err) {
            console.error(err);
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        }
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
