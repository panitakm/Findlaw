/**
 * js/lawyers.js
 * Handles search results, URL parsing, and filter interactions
 */
(() => {
    'use strict';

    let provincesData = [];
    let categoriesData = [];

    // State
    const state = {
        keyword: '',
        experience: '',
        province: '',
        price: '',
        category: ''
    };

    let activeFilterHistory = [];

    let currentUser = null;
    let savedLawyers = [];

    // DOM Elements
    const elements = {
        topSearchForm: document.getElementById('topSearchForm'),
        topKeywordInput: document.getElementById('topKeywordInput'),
        activeFiltersContainer: document.getElementById('activeFilters'),
        sidebarExperience: document.getElementById('sidebarExperience'),
        sidebarProvinceList: document.getElementById('sidebarProvinceList'),
        sidebarProvinceBtnText: document.getElementById('sidebarProvinceBtnText'),
        sidebarPrice: document.getElementById('sidebarPrice'),
        sidebarCategoryList: document.getElementById('sidebarCategoryList'),
        sidebarCategoryBtnText: document.getElementById('sidebarCategoryBtnText'),
        searchResults: document.getElementById('searchResults'),
        sidebarFilterForm: document.getElementById('sidebarFilterForm')
    };

    const updateStateFromHistory = () => {
        state.keyword = '';
        state.experience = '';
        state.province = '';
        state.price = '';
        state.category = '';
        
        const grouped = { province: [], category: [] };
        
        activeFilterHistory.forEach(f => {
            if (f.key === 'keyword') state.keyword = f.value;
            else if (f.key === 'experience') state.experience = f.value;
            else if (f.key === 'price') state.price = f.value;
            else if (f.key === 'province') grouped.province.push(f.value);
            else if (f.key === 'category') grouped.category.push(f.value);
        });
        
        state.province = grouped.province.join(',');
        state.category = grouped.category.join(',');
    };

    const parseUrlParams = () => {
        activeFilterHistory = [];
        const params = new URLSearchParams(window.location.search);
        
        if (params.get('keyword')) activeFilterHistory.push({ key: 'keyword', value: params.get('keyword') });
        if (params.get('experience')) activeFilterHistory.push({ key: 'experience', value: params.get('experience') });
        if (params.get('price')) activeFilterHistory.push({ key: 'price', value: params.get('price') });
        
        if (params.get('category')) {
            params.get('category').split(',').forEach(v => {
                if(v) activeFilterHistory.push({ key: 'category', value: v });
            });
        }
        if (params.get('province')) {
            params.get('province').split(',').forEach(v => {
                if(v) activeFilterHistory.push({ key: 'province', value: v });
            });
        }
        updateStateFromHistory();
    };

    const setSingleFilter = (key, value) => {
        activeFilterHistory = activeFilterHistory.filter(f => f.key !== key);
        if (value) {
            activeFilterHistory.push({ key, value });
        }
        updateStateFromHistory();
        updateUrlParams();
    };

    const toggleMultiFilter = (key, value, isChecked) => {
        if (isChecked) {
            if (!activeFilterHistory.some(f => f.key === key && f.value === value)) {
                activeFilterHistory.push({ key, value });
            }
        } else {
            activeFilterHistory = activeFilterHistory.filter(f => !(f.key === key && f.value === value));
        }
        updateStateFromHistory();
        updateUrlParams();
    };

    const updateUrlParams = () => {
        const url = new URL(window.location);
        Object.keys(state).forEach(key => {
            if (state[key]) url.searchParams.set(key, state[key]);
            else url.searchParams.delete(key);
        });
        window.history.pushState({}, '', url);
        renderActiveFilters();
        fetchLawyers();
    };

    const initSidebarUI = () => {
        elements.topKeywordInput.value = state.keyword;
        elements.sidebarExperience.value = state.experience;
        elements.sidebarPrice.value = state.price;
    };

    const loadProvinces = async () => {
        try {
            const res = await fetch('/lawyer/search/provinces');
            provincesData = await res.json();
            
            if (elements.sidebarProvinceList) {
                elements.sidebarProvinceList.innerHTML = ''; 
                const grouped = {};
                provincesData.forEach(p => {
                    if (!p.region || p.region.trim() === '') return; 
                    let regionName = p.region.includes('ภาค') || p.region.includes('กรุงเทพ') ? p.region : `ภาค${p.region}`;
                    if (!grouped[regionName]) grouped[regionName] = [];
                    grouped[regionName].push(p);
                });

                const selectedProvinceIds = state.province.split(',').filter(Boolean);

                for (const region in grouped) {
                    elements.sidebarProvinceList.innerHTML += `<li><h6 class="dropdown-header fw-bold text-dark mt-2">${region}</h6></li>`;
                    grouped[region].forEach(p => {
                        const isChecked = selectedProvinceIds.includes(p.id.toString()) ? 'checked' : '';
                        elements.sidebarProvinceList.innerHTML += `
                            <li>
                                <label class="dropdown-item d-flex align-items-center py-2 filter-dropdown-label">
                                    <input class="form-check-input me-3 mt-0 province-check" type="checkbox" value="${p.id}" data-name="${p.name}" ${isChecked}>
                                    ${p.name}
                                </label>
                            </li>
                        `;
                    });
                }
                updateProvinceButtonText();
            }
        } catch (error) {
            console.error("โหลดข้อมูลจังหวัดล้มเหลว:", error);
        }
    };

    let allCategories = [];
    const loadCategories = async () => {
        try {
            const res = await fetch('/lawyer/categories');
            const data = await res.json();
            
            // กรองคดีซ้ำ
            const uniqueCategories = [];
            const seen = new Set();
            for (const cat of data) {
                if (!seen.has(cat.name)) {
                    seen.add(cat.name);
                    uniqueCategories.push(cat);
                }
            }
            allCategories = uniqueCategories;
            
            if (elements.sidebarCategoryList) {
                elements.sidebarCategoryList.innerHTML = '';
                const selectedCats = state.category.split(',').filter(Boolean);
                
                allCategories.forEach(cat => {
                    const isChecked = selectedCats.includes(cat.name) ? 'checked' : '';
                    elements.sidebarCategoryList.innerHTML += `
                        <li>
                            <label class="dropdown-item d-flex align-items-center py-2 filter-dropdown-label">
                                <input class="form-check-input me-3 mt-0 category-check" type="checkbox" value="${cat.name}" data-name="${cat.name}" ${isChecked}>
                                ${cat.name}
                            </label>
                        </li>
                    `;
                });
                updateCategoryButtonText();
            }
        } catch (error) {
            console.error("โหลดหมวดหมู่ล้มเหลว:", error);
        }
    };

    const updateCategoryButtonText = () => {
        if (!elements.sidebarCategoryBtnText) return;
        const selectedNames = state.category ? state.category.split(',') : [];

        if (selectedNames.length === 0) {
            elements.sidebarCategoryBtnText.textContent = 'เลือกประเภทคดี';
            elements.sidebarCategoryBtnText.classList.add('text-muted');
        } else if (selectedNames.length <= 2) {
            elements.sidebarCategoryBtnText.textContent = selectedNames.join(', ');
            elements.sidebarCategoryBtnText.classList.remove('text-muted');
        } else {
            elements.sidebarCategoryBtnText.textContent = `เลือกแล้ว ${selectedNames.length} ประเภท`;
            elements.sidebarCategoryBtnText.classList.remove('text-muted');
        }
    };

    const updateProvinceButtonText = () => {
        const selectedIds = state.province ? state.province.split(',') : [];

        if (selectedIds.length === 0) {
            elements.sidebarProvinceBtnText.textContent = 'เลือกจังหวัด';
            elements.sidebarProvinceBtnText.classList.add('text-muted');
        } else if (selectedIds.length <= 2) {
            const names = selectedIds.map(id => {
                const p = provincesData.find(prov => prov.id.toString() === id);
                return p ? p.name : '';
            });
            elements.sidebarProvinceBtnText.textContent = names.join(', ');
            elements.sidebarProvinceBtnText.classList.remove('text-muted');
        } else {
            elements.sidebarProvinceBtnText.textContent = `เลือกแล้ว ${selectedIds.length} จังหวัด`;
            elements.sidebarProvinceBtnText.classList.remove('text-muted');
        }
    };

    const removeFilter = (key, valueToRemove = null) => {
        if (key === 'province' && valueToRemove) {
            toggleMultiFilter('province', valueToRemove, false);
            const chk = document.querySelector(`.province-check[value="${valueToRemove}"]`);
            if(chk) chk.checked = false;
            updateProvinceButtonText();
        } else if (key === 'category' && valueToRemove) {
            toggleMultiFilter('category', valueToRemove, false);
            const chk = document.querySelector(`.category-check[value="${valueToRemove}"]`);
            if(chk) chk.checked = false;
            updateCategoryButtonText();
        } else {
            setSingleFilter(key, '');
            if (key === 'keyword') elements.topKeywordInput.value = '';
            if (key === 'experience') elements.sidebarExperience.value = '';
            if (key === 'price') elements.sidebarPrice.value = '';
        }
    };

    const renderActiveFilters = () => {
        elements.activeFiltersContainer.innerHTML = '';
        
        const addChip = (label, key, valToRemove = null) => {
            const chip = document.createElement('div');
            chip.className = 'filter-chip';
            chip.innerHTML = `${label} <span class="remove-chip" title="ลบ">&times;</span>`;
            chip.querySelector('.remove-chip').addEventListener('click', () => removeFilter(key, valToRemove));
            elements.activeFiltersContainer.appendChild(chip);
        };

        activeFilterHistory.forEach(filter => {
            if (filter.key === 'keyword') {
                addChip(filter.value, 'keyword');
            } else if (filter.key === 'experience') {
                const expOption = elements.sidebarExperience.querySelector(`option[value="${filter.value}"]`);
                if (expOption) addChip(expOption.text, 'experience');
            } else if (filter.key === 'price') {
                const priceOption = elements.sidebarPrice.querySelector(`option[value="${filter.value}"]`);
                if (priceOption) addChip(priceOption.text, 'price');
            } else if (filter.key === 'category') {
                addChip(filter.value, 'category', filter.value);
            } else if (filter.key === 'province') {
                const p = provincesData.find(prov => prov.id.toString() === filter.value);
                if (p) addChip(p.name, 'province', filter.value);
            }
        });
    };

    const renderResults = (lawyers) => {
        elements.searchResults.innerHTML = ''; 
        if (lawyers.length === 0) {
            elements.searchResults.innerHTML = '<div class="col-12 text-center text-muted mt-5"><h5>ไม่พบทนายความที่ตรงกับเงื่อนไข</h5></div>';
            return;
        }

        lawyers.forEach(lawyer => {
            const imgHTML = lawyer.image_path 
                ? `<img src="${lawyer.image_path}" class="card-img-top rounded-top-4 lawyer-card-img" onerror="this.onerror=null; this.outerHTML='<div class=\\'d-flex justify-content-center align-items-center bg-light rounded-top-4 lawyer-card-img\\'><i class=\\'fa-solid fa-user\\' style=\\'font-size: 80px; color: #dee2e6;\\'></i></div>';">`
                : `<div class="d-flex justify-content-center align-items-center bg-light rounded-top-4 lawyer-card-img"><i class="fa-solid fa-user" style="font-size: 80px; color: #dee2e6;"></i></div>`;
            const expText = lawyer.total_experience > 0 ? `${lawyer.total_experience} ปี` : 'น้อยกว่า 1 ปี';
            let feeRate = 'ไม่ระบุ';
            if (lawyer.fee_rate) {
                const fee = parseInt(lawyer.fee_rate, 10);
                if (fee <= 1000) feeRate = '0 - 1,000 บาท';
                else if (fee <= 3000) feeRate = '1,000 - 3,000 บาท';
                else if (fee <= 5000) feeRate = '3,000 - 5,000 บาท';
                else feeRate = 'เริ่มต้น 5,000 บาท';
            }
            const specialties = lawyer.specialties ? (Array.isArray(lawyer.specialties) ? lawyer.specialties.join(' ') : lawyer.specialties.split(',').join(' ')) : 'ไม่ระบุ';
            const isSaved = savedLawyers.includes(lawyer.id);
            const heartClass = isSaved ? 'text-danger' : 'text-secondary';
            const heartTitle = isSaved ? 'บันทึกแล้ว' : 'ยังไม่บันทึก';

            const saveBtnHtml = (!currentUser || currentUser.role === 'user') ? `
                <button class="btn btn-light position-absolute top-0 end-0 m-2 rounded-circle shadow-sm btn-save-lawyer btn-save-lawyer-custom d-flex align-items-center justify-content-center" data-lawyer-id="${lawyer.id}" title="${heartTitle}">
                    <i class="fa-solid fa-bookmark ${heartClass}"></i>
                </button>
            ` : '';

            elements.searchResults.innerHTML += `
                <div class="col-md-6 col-lg-4">
                    <a href="/lawyer_profile?id=${lawyer.id}" class="text-decoration-none text-dark d-block h-100">
                        <div class="card h-100 shadow-sm border-0 position-relative rounded-4 hover-scale pb-3" style="min-height: 380px;">
                            ${saveBtnHtml}
                            ${imgHTML}
                            <div class="card-body">
                                <h4 class="card-title fw-bold lawyer-name-color mb-1" style="font-size: 1.25rem;">${lawyer.full_name}</h4>
                                <div class="mb-3 d-flex align-items-center gap-2">
                                    <div class="text-warning" style="font-size: 0.9rem;">
                                        ${getStarRatingHTML(parseFloat(lawyer.rating) || 0)}
                                    </div>
                                    <span class="text-muted small fw-semibold">${(parseFloat(lawyer.rating) || 0).toFixed(1)} (${lawyer.review_count || 0} รีวิว)</span>
                                </div>
                                <p class="card-text text-muted mb-1"><i class="fa-solid fa-location-dot lawyer-icon-color fa-fw me-2"></i>จ.${lawyer.province_name || 'ไม่ระบุ'}</p>
                                <p class="card-text text-muted mb-1"><i class="fa-solid fa-briefcase lawyer-icon-color fa-fw me-2"></i>ประสบการณ์: ${expText}</p>
                                <p class="card-text text-muted mb-1"><i class="fa-solid fa-baht-sign lawyer-icon-color fa-fw me-2"></i>ค่าบริการ: ${feeRate}</p>
                                <p class="card-text text-muted mb-1"><i class="fa-solid fa-scale-balanced lawyer-icon-color fa-fw me-2"></i><span class="text-truncate d-inline-block lawyer-specialty-text">${specialties}</span></p>
                            </div>
                        </div>
                    </a>
                </div>
            `;
        });

        document.querySelectorAll('.btn-save-lawyer').forEach(btn => {
            btn.addEventListener('click', handleSaveLawyerToggle);
        });
    };

    const fetchLawyers = async () => {
        try {
            elements.searchResults.innerHTML = '<div class="col-12 text-center mt-5"><div class="spinner-grow text-secondary"></div></div>';
            const params = new URLSearchParams();
            if(state.keyword) params.append('keyword', state.keyword);
            if(state.experience) params.append('experience', state.experience);
            if(state.province) params.append('province', state.province);
            if(state.price) params.append('price', state.price);
            if(state.category) params.append('category', state.category);

            const url = `/lawyer/search?${params.toString()}`;
            const response = await fetch(url);
            const data = await response.json();
            
            renderResults(data);
        } catch (error) {
            console.error("ค้นหาล้มเหลว:", error);
            elements.searchResults.innerHTML = '<div class="col-12 text-center text-danger mt-5">เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์</div>';
        }
    };

    async function fetchSavedLawyers(userId) {
        try {
            const res = await fetch(`/users/${userId}/favorites`);
            if (res.ok) {
                const data = await res.json();
                savedLawyers = data.map(lawyer => lawyer.id);
            }
        } catch (err) {
            console.error("Error fetching favorites:", err);
        }
    }

    async function handleSaveLawyerToggle(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!currentUser) {
            await window.showBSAlert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนทำการบันทึก', 'warning');
            window.location.href = '/sign_in';
            return;
        }
        
        const btn = e.currentTarget;
        const lawyerId = parseInt(btn.getAttribute('data-lawyer-id'));
        const isCurrentlySaved = savedLawyers.includes(lawyerId);
        
        try {
            const method = isCurrentlySaved ? 'DELETE' : 'POST';
            const res = await fetch('/users/favorites', {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: currentUser.id, lawyer_id: lawyerId })
            });

            if (res.ok) {
                if (isCurrentlySaved) {
                    savedLawyers = savedLawyers.filter(id => id !== lawyerId);
                    btn.title = 'ยังไม่บันทึก';
                    btn.querySelector('i').classList.remove('text-danger');
                    btn.querySelector('i').classList.add('text-secondary');
                } else {
                    savedLawyers.push(lawyerId);
                    btn.title = 'บันทึกแล้ว';
                    btn.querySelector('i').classList.remove('text-secondary');
                    btn.querySelector('i').classList.add('text-danger');
                }
            }
        } catch (err) {
            console.error("Error toggling favorite:", err);
            await window.showBSAlert('เกิดข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
        }
    }

    const setupEventListeners = () => {
        elements.topSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            setSingleFilter('keyword', elements.topKeywordInput.value);
        });

        elements.sidebarExperience.addEventListener('change', (e) => {
            setSingleFilter('experience', e.target.value);
        });

        elements.sidebarPrice.addEventListener('change', (e) => {
            setSingleFilter('price', e.target.value);
        });

        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('province-check')) {
                toggleMultiFilter('province', e.target.value, e.target.checked);
                updateProvinceButtonText();
            }
            if (e.target.classList.contains('category-check')) {
                toggleMultiFilter('category', e.target.value, e.target.checked);
                updateCategoryButtonText();
            }
        });
    };

    const init = async () => {
        if (typeof Auth !== 'undefined') {
            currentUser = Auth.getUser();
            if (currentUser) {
                await fetchSavedLawyers(currentUser.id);
            }
        }

        parseUrlParams();
        initSidebarUI();
        setupEventListeners();
        
        await Promise.all([loadProvinces(), loadCategories()]);
        
        renderActiveFilters();
        fetchLawyers();
    };

    document.addEventListener('DOMContentLoaded', init);

})();

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
