(() => {
    'use strict';

    const loadProvinces = async () => {
        try {
            const res = await fetch('http://localhost:3000/lawyer/search/provinces');
            const provinces = await res.json();
            const provinceList = document.getElementById('provinceList'); 

            if (provinceList) {
                provinceList.innerHTML = ''; 
                const grouped = {};

                provinces.forEach(p => {
                    if (!p.region || p.region.trim() === '') return; 
                    let regionName = p.region.includes('ภาค') || p.region.includes('กรุงเทพ') ? p.region : `ภาค${p.region}`;
                    
                    if (!grouped[regionName]) grouped[regionName] = [];
                    grouped[regionName].push(p);
                });

                for (const region in grouped) {
                    provinceList.innerHTML += `<li><h6 class="dropdown-header fw-bold text-dark mt-2">${region}</h6></li>`;
                    
                    grouped[region].forEach(p => {
                        provinceList.innerHTML += `
                            <li>
                                <label class="dropdown-item d-flex align-items-center py-2" style="cursor: pointer;">
                                    <input class="form-check-input me-3 mt-0 province-check" type="checkbox" value="${p.id}" data-name="${p.name}">
                                    ${p.name}
                                </label>
                            </li>
                        `;
                    });
                }

                const checkboxes = document.querySelectorAll('.province-check');
                const btnText = document.getElementById('provinceBtnText');

                checkboxes.forEach(chk => {
                    chk.addEventListener('change', () => {
                        const selected = Array.from(checkboxes).filter(c => c.checked);

                        if (selected.length === 0) {
                            btnText.textContent = 'เลือกจังหวัด...';
                            btnText.classList.add('text-muted');
                            btnText.classList.remove('text-dark');
                        } else if (selected.length <= 2) {
                            btnText.textContent = selected.map(c => c.dataset.name).join(', ');
                            btnText.classList.remove('text-muted');
                            btnText.classList.add('text-dark');
                        } else {
                            btnText.textContent = `เลือกแล้ว ${selected.length} จังหวัด`;
                            btnText.classList.remove('text-muted');
                            btnText.classList.add('text-dark');
                        }
                    });
                });
            }
        } catch (error) {
            console.error("โหลดข้อมูลจังหวัดล้มเหลว:", error);
            document.getElementById('provinceBtnText').textContent = "โหลดจังหวัดไม่สำเร็จ";
        }
    };

    const loadCategoriesForSuggestion = async () => {
    try {
        const res = await fetch('http://localhost:3000/lawyer/categories');
        const categories = await res.json();
        const datalist = document.getElementById('categoryList');
        
        if (datalist) {
            categories.forEach(cat => {
                datalist.innerHTML += `<option value="${cat.name}">`;
            });
        }
    } catch (error) {
        console.error("โหลดหมวดหมู่ล้มเหลว:", error);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadProvinces();
    loadCategoriesForSuggestion();
});
    //แสดงข้อมูลทนายแบบย่อๆ
    const renderResults = (lawyers) => {
        const container = document.getElementById('searchResults');
        container.innerHTML = ''; 

        if (lawyers.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted mt-5"><h5>ไม่พบทนายความที่ค้นหา</h5></div>';
            return;
        }

        lawyers.forEach(lawyer => {
            const imgSrc = lawyer.image_path || 'https://via.placeholder.com/150?text=No+Image';
            const expText = lawyer.total_experience > 0 ? `${lawyer.total_experience} ปี` : 'น้อยกว่า 1 ปี';

            container.innerHTML += `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100 shadow-sm border-0">
                        <img src="${imgSrc}" class="card-img-top" style="height: 220px; object-fit: cover;">
                        <div class="card-body">
                            <h5 class="card-title fw-bold text-primary">${lawyer.full_name}</h5>
                            <p class="card-text text-muted mb-1"><i class="bi bi-geo-alt-fill text-danger me-2"></i>จ.${lawyer.province_name || 'ไม่ระบุ'}</p>
                            <p class="card-text text-muted"><i class="bi bi-briefcase-fill text-warning me-2"></i>ประสบการณ์: ${expText}</p>
                        </div>
                        <div class="card-footer bg-white border-top-0 pb-4 text-center">
                            <a href="lawyerProfile.html?id=${lawyer.id}" class="btn btn-outline-primary rounded-pill w-100">ดูโปรไฟล์</a>
                        </div>
                    </div>
                </div>
            `;
        });
    };

    //ตอนกดปุ่มค้นหา
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            const searchContainer = document.querySelector('.search-container');
            document.querySelector('.search-container')?.classList.add('compact');
            document.querySelector('.title-text')?.classList.add('d-none');

            const keyword = document.querySelector('input[name="keyword"]').value;
            const experience = document.getElementById('nameExp').value;
            
            const checkedBoxes = document.querySelectorAll('.province-check:checked');
            const provinceIds = Array.from(checkedBoxes).map(chk => chk.value).join(','); 

            try {
                document.getElementById('searchResults').innerHTML = '<div class="col-12 text-center mt-5"><div class="spinner-border text-primary"></div></div>';
                const url = `http://localhost:3000/lawyer/search?keyword=${encodeURIComponent(keyword)}&experience=${experience}&province=${provinceIds}`;
                console.log(url);
                const response = await fetch(url);
                const data = await response.json();
                
                renderResults(data);
            } catch (error) {
                console.error("ค้นหาล้มเหลว:", error);
                document.getElementById('searchResults').innerHTML = '<div class="col-12 text-center text-danger mt-5">เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์</div>';
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadProvinces();
        loadCategoriesForSuggestion();

        // if (searchForm) {
        //     setTimeout(() => {
        //         searchForm.dispatchEvent(new Event('submit'));
        //     }, 500); 
        // }
    });

})();