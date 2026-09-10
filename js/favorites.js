document.addEventListener('DOMContentLoaded', () => {
    initFavoritesPage();
});

let savedLawyers = [];
let userId = null;

async function initFavoritesPage() {
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

    await fetchSavedLawyers();
    updateStatsCounter();
    setupSearchAndFilter();
}

async function fetchSavedLawyers() {
    try {
        const res = await fetch(`http://localhost:3000/users/${userId}/favorites`);
        if (res.ok) {
            savedLawyers = await res.json();
        } else {
            savedLawyers = [];
        }
        renderLawyersList(savedLawyers);
    } catch (err) {
        console.error("Error fetching favorites:", err);
        savedLawyers = [];
        renderLawyersList(savedLawyers);
    }
}

function updateStatsCounter() {
    const totalCountEl = document.getElementById('totalSavedCount');
    const badgeCountEl = document.getElementById('badgeSavedCount');
    
    if (totalCountEl) totalCountEl.textContent = savedLawyers.length;
    if (badgeCountEl) badgeCountEl.textContent = `${savedLawyers.length} คน`;
}

function renderLawyersList(lawyers) {
    const container = document.getElementById('savedLawyersContainer');
    if (!container) return;

    if (lawyers.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="card border-0 shadow-sm rounded-4 p-5 mx-auto" style="max-width: 500px;">
                    <div class="text-muted mb-3">
                        <i class="fa-solid fa-bookmark text-secondary" style="font-size: 4rem;"></i>
                    </div>
                    <h4 class="fw-bold mb-2" style="color: #0A3D73;">ไม่มีทนายความที่บันทึกไว้</h4>
                    <p class="text-muted small mb-4">คุณยังไม่มีรายการทนายความในรายการโปรด หรือไม่พบทนายความที่ตรงตามเงื่อนไขการค้นหา</p>
                    <div>
                        <a href="/search.html" class="btn btn-primary rounded-pill px-4 py-2" style="background-color: #0A3D73;">
                            <i class="fa-solid fa-magnifying-glass me-2"></i>ค้นหาทนายความ
                        </a>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = lawyers.map(lawyer => `
        <div class="col-md-6 col-xl-4 lawyer-item" id="lawyer-card-${lawyer.id}">
            <div class="card lawyer-card h-100 p-4 border-0 shadow-sm rounded-4 position-relative">
                
                <!-- Bookmark Icon (Top Right) -->
                <button type="button" class="bookmark-btn border-0 position-absolute bg-danger bg-opacity-10 rounded d-flex align-items-center justify-content-center" style="top: 24px; right: 24px; width: 42px; height: 42px;" title="ยกเลิกการบันทึก" onclick="confirmRemoveLawyer(${lawyer.id}, '${lawyer.full_name}')">
                    <i class="fa-solid fa-bookmark fs-5 text-danger opacity-75 hover-opacity-100"></i>
                </button>

                <!-- Avatar, Name, License (Top Left) -->
                <div class="d-flex align-items-center gap-4 mb-4 pe-5">
                    <img src="${lawyer.image_path || '/css/pic/person-circle.svg'}" alt="${lawyer.full_name}" class="rounded-circle shadow-sm flex-shrink-0" style="object-fit: cover; width: 85px; height: 85px; border: 3px solid #fff;">
                    <div>
                        <h5 class="fw-bold mb-1 text-dark" style="font-size: 1.2rem;">${lawyer.full_name || 'ไม่ได้ระบุ'}</h5>
                        <span class="text-muted small">เลขที่ใบอนุญาต : ${lawyer.license_number || 'ไม่ได้ระบุ'}</span>
                    </div>
                </div>

                <!-- Address & Experience -->
                <div class="mb-3 text-muted small">
                    <div class="d-flex align-items-start mb-3">
                        <i class="fa-solid fa-location-dot text-danger me-2 mt-1"></i>
                        <div><span class="fw-medium text-dark">ที่อยู่ </span>${lawyer.address || 'ไม่ได้ระบุ'}</div>
                    </div>
                    <div class="d-flex align-items-center">
                        <i class="fa-solid fa-briefcase text-primary me-2"></i>
                        <div><span class="fw-medium text-dark">ประสบการณ์ทำงาน </span>${lawyer.experience || 0} ปี</div>
                    </div>
                </div>

                <!-- Rating -->
                <div class="d-flex align-items-center mb-4">
                    <div class="text-warning me-2 fs-6">
                        ${getStarRatingHTML(Number(lawyer.rating || 0))}
                    </div>
                    <span class="fw-bold text-dark me-1">${Number(lawyer.rating || 0).toFixed(1)}</span>
                    <span class="text-muted small">(${lawyer.reviews_count || 0} รีวิว)</span>
                </div>

                <!-- Specialties -->
                <div class="mb-3 flex-grow-1">
                    <div class="d-flex flex-nowrap align-items-center gap-2 overflow-hidden">
                        ${(() => {
                            const specs = lawyer.specialties ? (Array.isArray(lawyer.specialties) ? lawyer.specialties : lawyer.specialties.split(',')) : [];
                            if (specs.length === 0) return '<span class="text-muted small">ไม่ได้ระบุ</span>';
                            if (specs.length <= 3) {
                                return specs.map(spec => `<span class="badge bg-primary bg-opacity-10 text-primary fw-medium rounded-pill px-3 py-2 text-truncate" style="max-width: 100%; min-width: 0;">${spec}</span>`).join('');
                            }
                            return specs.slice(0, 3).map(spec => `<span class="badge bg-primary bg-opacity-10 text-primary fw-medium rounded-pill px-3 py-2 text-truncate" style="max-width: 100%; min-width: 0;">${spec}</span>`).join('') + ` <a href="/lawyerProfile.html?id=${lawyer.id}" class="text-primary small fw-medium ms-1 text-decoration-none border-bottom border-primary flex-shrink-0">ดูทั้งหมด</a>`;
                        })()}
                    </div>
                </div>

                <!-- View Profile Button -->
                <div class="mt-auto">
                    <a href="/lawyerProfile.html?id=${lawyer.id}" class="btn btn-outline-primary w-100 text-center text-decoration-none py-2 rounded-pill fw-bold">
                        <i class="fa-solid fa-user-tie me-1"></i> ดูโปรไฟล์
                    </a>
                </div>
            </div>
        </div>
    `).join('');

}

function getStarRatingHTML(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fa-solid fa-star"></i>';
    }
    if (hasHalf) {
        stars += '<i class="fa-solid fa-star-half-stroke"></i>';
    }
    const remaining = 5 - Math.ceil(rating);
    for (let i = 0; i < remaining; i++) {
        stars += '<i class="fa-regular fa-star"></i>';
    }
    return stars;
}

function setupSearchAndFilter() {
    const searchInput = document.getElementById('favoriteSearchInput');
    const categorySelect = document.getElementById('favoriteCategorySelect');
    const sortSelect = document.getElementById('favoriteSortSelect');

    const filterFunction = () => {
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const category = categorySelect ? categorySelect.value : '';
        const sort = sortSelect ? sortSelect.value : '';

        let filtered = savedLawyers.filter(lawyer => {
            const matchesQuery = !query || 
                lawyer.full_name.toLowerCase().includes(query) ||
                lawyer.province_name.toLowerCase().includes(query) ||
                lawyer.specialties.some(s => s.toLowerCase().includes(query));

            const matchesCategory = !category || 
                lawyer.specialties.some(s => s.includes(category));

            return matchesQuery && matchesCategory;
        });

        if (sort === 'rating') {
            filtered.sort((a, b) => b.rating - a.rating);
        } else if (sort === 'experience') {
            filtered.sort((a, b) => b.experience - a.experience);
        } else if (sort === 'name') {
            filtered.sort((a, b) => a.full_name.localeCompare(b.full_name, 'th'));
        }

        renderLawyersList(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', filterFunction);
    if (categorySelect) categorySelect.addEventListener('change', filterFunction);
    if (sortSelect) sortSelect.addEventListener('change', filterFunction);
}

// Global modal triggers
window.confirmRemoveLawyer = async function(id, name) {
    if (confirm(`คุณต้องการลบ "${name}" ออกจากรายการทนายความที่บันทึกไว้ใช่หรือไม่?`)) {
        try {
            // Call API to delete from database
            const res = await fetch('http://localhost:3000/users/favorites', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, lawyer_id: id })
            });

            if (res.ok) {
                // Remove visual elements (optional but good for feedback)
                const cardEl = document.getElementById(`lawyer-card-${id}`);
                if (cardEl) {
                    cardEl.classList.add('fade-out-card');
                }
                
                showToast(`ลบ ${name} ออกจากรายการบันทึกเรียบร้อยแล้ว`);
                
                // Refresh the page after a short delay to see the updated data
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            } else {
                alert("เกิดข้อผิดพลาดในการลบข้อมูล");
            }
        } catch (err) {
            console.error(err);
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
        }
    }
};

window.openContactModal = function(id) {
    const lawyer = savedLawyers.find(l => l.id === id);
    if (!lawyer) return;

    document.getElementById('modalLawyerName').textContent = lawyer.full_name;
    document.getElementById('modalLawyerPhone').textContent = lawyer.phone;
    document.getElementById('modalLawyerPhoneLink').href = `tel:${lawyer.phone}`;
    document.getElementById('modalLawyerEmail').textContent = lawyer.email;
    document.getElementById('modalLawyerEmailLink').href = `mailto:${lawyer.email}`;
    document.getElementById('modalLawyerLine').textContent = lawyer.line_id;
    document.getElementById('modalLawyerAddress').textContent = lawyer.office_address;

    const modal = new bootstrap.Modal(document.getElementById('contactModal'));
    modal.show();
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
