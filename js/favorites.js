document.addEventListener('DOMContentLoaded', () => {
    initFavoritesPage();
});

let savedLawyers = [];
let userId = null;

async function initFavoritesPage() {
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

    await fetchSavedLawyers();
    updateStatsCounter();
    setupSearchAndFilter();
}

async function fetchSavedLawyers() {
    try {
        const res = await fetch(`/users/${userId}/favorites`);
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
                        <i class="fa-solid fa-bookmark text-secondary" style="font-size: 3rem;"></i>
                    </div>
                    <h4 class="fw-bold mb-4" style="color: #1A435A;">ไม่มีทนายความที่บันทึกไว้</h4>
                    <div>
                        <a href='/' class="btn btn-primary rounded-pill px-4 py-2 border-0 shadow-lg" style="background-color: #4987A4; font-size: 1.1rem; border: none; font-weight: 500;">
                            <i class="fa-solid fa-magnifying-glass me-2 text-white"></i><span class="text-white">ค้นหาทนายความ</span>
                        </a>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = lawyers.map(lawyer => {
        const imgHTML = lawyer.image_path 
            ? `<img src="${lawyer.image_path}" class="card-img-top rounded-top-4" style="height: 200px; min-height: 200px; max-height: 200px; width: 100%; object-fit: cover; object-position: top; display: block; flex-shrink: 0;">`
            : `<div class="d-flex justify-content-center align-items-center bg-light rounded-top-4" style="height: 200px; min-height: 200px; max-height: 200px; width: 100%; display: block; flex-shrink: 0;"><i class="fa-solid fa-user" style="font-size: 80px; color: #dee2e6;"></i></div>`;
        const expText = lawyer.experience > 0 ? `${lawyer.experience} ปี` : 'น้อยกว่า 1 ปี';
        
        let feeRate = 'ไม่ระบุ';
        if (lawyer.fee_rate) {
            const fee = parseInt(lawyer.fee_rate, 10);
            if (fee <= 1000) feeRate = '0 - 1,000 บาท';
            else if (fee <= 3000) feeRate = '1,000 - 3,000 บาท';
            else if (fee <= 5000) feeRate = '3,000 - 5,000 บาท';
            else feeRate = 'เริ่มต้น 5,000 บาท';
        }

        const specialties = (() => {
            const specs = lawyer.specialties ? (Array.isArray(lawyer.specialties) ? lawyer.specialties : lawyer.specialties.split(',')) : [];
            if (specs.length === 0) return 'ไม่ระบุ';
            return specs.join(' ');
        })();

        return `
        <div class="col-md-6 col-lg-4 lawyer-item" id="lawyer-card-${lawyer.id}">
            <a href="/lawyer_profile?id=${lawyer.id}" class="text-decoration-none text-dark d-block h-100">
                <div class="card h-100 shadow-sm border-0 position-relative rounded-4 hover-scale pb-3" style="min-height: 380px;">
                    <button type="button" class="btn btn-light position-absolute top-0 end-0 m-2 rounded-circle shadow-sm btn-save-lawyer-custom d-flex align-items-center justify-content-center" data-lawyer-id="${lawyer.id}" title="ยกเลิกการบันทึก" onclick="event.preventDefault(); window.confirmRemoveLawyer(${lawyer.id}, '${lawyer.full_name}')" style="z-index: 10;">
                        <i class="fa-solid fa-bookmark text-danger"></i>
                    </button>
                    ${imgHTML}
                    <div class="card-body">
                        <h4 class="card-title fw-bold lawyer-name-color mb-1" style="font-size: 1.25rem;">${lawyer.full_name || 'ไม่ระบุ'}</h4>
                        <div class="mb-3 d-flex align-items-center gap-2">
                            <div class="text-warning" style="font-size: 0.9rem;">
                                ${getStarRatingHTML(parseFloat(lawyer.rating) || 0)}
                            </div>
                            <span class="text-muted small fw-semibold">${(parseFloat(lawyer.rating) || 0).toFixed(1)} (${lawyer.review_count || 0} รีวิว)</span>
                        </div>
                        <p class="card-text text-muted mb-1"><i class="fa-solid fa-location-dot lawyer-icon-color fa-fw me-2"></i>จ.${lawyer.province_name || lawyer.address || 'ไม่ระบุ'}</p>
                        <p class="card-text text-muted mb-1"><i class="fa-solid fa-briefcase lawyer-icon-color fa-fw me-2"></i>ประสบการณ์: ${expText}</p>
                        <p class="card-text text-muted mb-1"><i class="fa-solid fa-baht-sign lawyer-icon-color fa-fw me-2"></i>ค่าบริการ: ${feeRate}</p>
                        <p class="card-text text-muted mb-1"><i class="fa-solid fa-scale-balanced lawyer-icon-color fa-fw me-2"></i><span class="text-truncate d-inline-block lawyer-specialty-text" style="max-width: 85%; vertical-align: bottom;">${specialties}</span></p>
                    </div>
                </div>
            </a>
        </div>
        `;
    }).join('');

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
        stars += '<i class="fa-regular fa-star text-muted opacity-25"></i>';
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
        } else if (sort === 'fee_asc') {
            filtered.sort((a, b) => (parseInt(a.fee_rate) || 0) - (parseInt(b.fee_rate) || 0));
        } else if (sort === 'fee_desc') {
            filtered.sort((a, b) => (parseInt(b.fee_rate) || 0) - (parseInt(a.fee_rate) || 0));
        }

        renderLawyersList(filtered);
    };

    if (searchInput) searchInput.addEventListener('input', filterFunction);
    if (categorySelect) categorySelect.addEventListener('change', filterFunction);
    if (sortSelect) sortSelect.addEventListener('change', filterFunction);
}

// Global modal triggers
window.confirmRemoveLawyer = async function(id, name) {
    const confirmed = await window.showBSConfirm(
        'ยืนยันการลบ',
        `ต้องการลบ "${name}" ออกจากรายการหรือไม่ ?`,
        'ลบ',
        'ยกเลิก',
        'btn-danger'
    );
    
    if (confirmed) {
        try {
            // Call API to delete from database
            const res = await fetch('/users/favorites', {
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
                window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
            }
        } catch (err) {
            console.error(err);
            window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
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
