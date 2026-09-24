(() => {
    'use strict';

    const loadProvinces = async () => {
        try {
            const res = await fetch('/lawyer/search/provinces');
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

    let allCategories = [];

    const loadCategoriesForSuggestion = async () => {
        try {
            const res = await fetch('/lawyer/categories');
            const data = await res.json();
            allCategories = data;
            
            setupAutocomplete();
        } catch (error) {
            console.error("โหลดหมวดหมู่ล้มเหลว:", error);
        }
    };

    const setupAutocomplete = () => {
        const input = document.getElementById('keywordInput');
        const box = document.getElementById('suggestionBox');
        if (!input || !box) return;

        const renderSuggestions = (filterText = '') => {
            box.innerHTML = '';
            const filtered = allCategories.filter(cat => cat.name.toLowerCase().includes(filterText.toLowerCase()));
            
            if (filtered.length === 0) {
                box.classList.remove('show');
                return;
            }

            filtered.forEach(cat => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.className = 'dropdown-item py-2';
                a.href = '#';
                a.textContent = cat.name;
                a.addEventListener('click', (e) => {
                    e.preventDefault(); 
                    input.value = cat.name;
                    box.classList.remove('show');
                });
                
                li.appendChild(a);
                box.appendChild(li);
            });
            box.classList.add('show');
        };

        input.addEventListener('focus', () => renderSuggestions(input.value));
        input.addEventListener('input', (e) => renderSuggestions(e.target.value));
        
        // หน่วงเวลาตอน blur เพื่อให้ event click ทำงานทัน
        input.addEventListener('blur', () => {
            setTimeout(() => box.classList.remove('show'), 200);
        });
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

        // ใช้ array จริงๆ ของทนายความเลย Swiper จะจัดการ Loop ให้เอง
        const displayLawyers = lawyers;

        displayLawyers.forEach(lawyer => {
            const imgHTML = lawyer.image_path 
                ? `<img src="${lawyer.image_path}" class="card-img-top rounded-top-4 lawyer-card-img">`
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

            container.innerHTML += `
                <div class="swiper-slide lawyer-slide-item">
                    <a href="/lawyer_profile?id=${lawyer.id}" class="text-decoration-none text-dark d-block h-100">
                        <div class="card h-100 shadow-sm border-0 rounded-4 lawyer-card-item pb-4" style="min-height: 380px;">
                            ${imgHTML}
                            <div class="lawyer-card-body">
                                <h4 class="lawyer-card-title fw-bold mb-1" style="font-size: 1.25rem;">${lawyer.full_name}</h4>
                                <div class="mb-3 d-flex align-items-center gap-2">
                                    <div class="text-warning" style="font-size: 0.9rem;">
                                        ${getStarRatingHTML(parseFloat(lawyer.rating) || 0)}
                                    </div>
                                    <span class="text-muted small fw-semibold">${(parseFloat(lawyer.rating) || 0).toFixed(1)} (${lawyer.review_count || 0} รีวิว)</span>
                                </div>
                                <p class="lawyer-card-info"><i class="fa-solid fa-location-dot lawyer-card-icon lawyer-icon-location fa-fw"></i>จ. ${lawyer.province_name || 'ไม่ระบุ'}</p>
                                <p class="lawyer-card-info"><i class="fa-solid fa-briefcase lawyer-card-icon lawyer-icon-exp fa-fw"></i>ประสบการณ์: ${expText}</p>
                                <p class="lawyer-card-info"><i class="fa-solid fa-baht-sign lawyer-card-icon lawyer-icon-fee fa-fw"></i>ค่าบริการ: ${feeRate}</p>
                                <p class="lawyer-card-info mb-0"><i class="fa-solid fa-scale-balanced lawyer-card-icon lawyer-icon-case fa-fw"></i><span class="lawyer-card-specialty">${specialties}</span></p>
                            </div>
                        </div>
                    </a>
                </div>
            `;
        });
        
        setupCarousel();
    };

    const setupCarousel = () => {
        // Initialize Swiper with Standard Slide Effect
        new Swiper('.lawyer-swiper', {
            grabCursor: true,
            centeredSlides: true,
            slidesPerView: 'auto',
            spaceBetween: 30, // เว้นระยะห่างระหว่างการ์ดให้เหมือนรูป
            loop: false,
            nested: true, // Prevents parent swiper from stealing touch events
            autoplay: {
                delay: 2500,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
        });
    };

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            const keyword = document.querySelector('input[name="keyword"]').value;
            const experience = document.getElementById('nameExp').value;
            const price = document.getElementById('priceRange').value;
            
            const checkedBoxes = document.querySelectorAll('.province-check:checked');
            const provinceIds = Array.from(checkedBoxes).map(chk => chk.value).join(','); 

            const url = `/lawyers?keyword=${encodeURIComponent(keyword)}&experience=${encodeURIComponent(experience)}&province=${encodeURIComponent(provinceIds)}&price=${encodeURIComponent(price)}`;
            window.location.href = url;
        });
    }

    const fetchInitialLawyers = async () => {
        try {
            document.getElementById('searchResults').innerHTML = '<div class="col-12 text-center mt-5"><div class="spinner-border text-primary"></div></div>';
            const response = await fetch('/lawyer/search');
            const data = await response.json();
            // Show more data to allow scrolling
            renderResults(data.slice(0, 10));
        } catch (error) {
            console.error("ดึงข้อมูลเริ่มต้นล้มเหลว:", error);
            document.getElementById('searchResults').innerHTML = '<div class="col-12 text-center text-danger mt-5">เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์</div>';
        }
    };

    const setupMainSwiper = () => {
        // Enable full page scroll for all screen sizes as requested
        new Swiper('.main-swiper', {
            direction: 'vertical',
            slidesPerView: 1,
            mousewheel: {
                forceToAxis: true,
                sensitivity: 1,
                releaseOnEdges: true, // Allow native scrolling when reaching the edge
            },
            touchReleaseOnEdges: true, // Allow native touch scrolling when reaching the edge
            speed: 1000, // 1 second animation duration
            keyboard: {
                enabled: true,
                onlyInViewport: false,
            },
        });
    };
    // Typing Animation for Hero Title
    const startTypingAnimation = () => {
        const titleEl = document.getElementById('typingTitle');
        if (!titleEl) return;

        const text = 'ค้นหาที่ปรึกษาทางกฎหมายที่เหมาะกับคุณ';
        let index = 0;
        let isDeleting = false;

        const type = () => {
            titleEl.classList.remove('typing-done'); // ให้เคอร์เซอร์กะพริบตลอดเวลาตอนลบและพิมพ์
            
            if (!isDeleting) {
                titleEl.textContent = text.substring(0, index + 1);
                index++;
                if (index === text.length) {
                    isDeleting = true;
                    setTimeout(type, 3000); // หยุดรอ 3 วินาทีเมื่อพิมพ์เสร็จ
                } else {
                    setTimeout(type, 80); // ความเร็วในการพิมพ์
                }
            } else {
                titleEl.textContent = text.substring(0, index - 1);
                index--;
                if (index === 0) {
                    isDeleting = false;
                    setTimeout(type, 800); // หยุดรอ 0.8 วินาทีก่อนเริ่มพิมพ์ใหม่
                } else {
                    setTimeout(type, 40); // ความเร็วในการลบ (เร็วกว่าพิมพ์)
                }
            }
        };

        // เริ่มพิมพ์หลังจากโหลดหน้าเสร็จ 0.5 วินาที
        setTimeout(type, 500);
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadProvinces();
        loadCategoriesForSuggestion();
        fetchInitialLawyers();
        setupMainSwiper();
        startTypingAnimation();
    });

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
