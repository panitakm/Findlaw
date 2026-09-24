const urlParams = new URLSearchParams(window.location.search);
const lawyerId = urlParams.get('id'); // ดึง ID จาก URL (?id=...)
const currentYearTH = new Date().getFullYear() + 543;

let currentUser = null;
let currentLawyerReviews = [];
let isLawyerSaved = false;

window.onload = async () => {
    if (typeof Auth !== 'undefined') {
        currentUser = Auth.getUser();
        if (currentUser && currentUser.role === 'lawyer') {
            const btnWriteReview = document.getElementById('btnWriteReview');
            if (btnWriteReview) btnWriteReview.style.display = 'none';
        }
    }

    if (!lawyerId) {
        await window.showBSAlert('ข้อผิดพลาด', 'ไม่พบรหัสทนายความ กรุณากลับไปหน้าค้นหา', 'error');
        window.location.href = '/';
        return;
    }

    if (currentUser) {
        try {
            const res = await fetch(`/users/${currentUser.id}/favorites`);
            if (res.ok) {
                const favs = await res.json();
                isLawyerSaved = favs.some(f => f.id == lawyerId);
            }
        } catch (err) {
            console.error("Error fetching favorites:", err);
        }
    }

    const saveBtn = document.getElementById('btnSaveLawyerProfile');
    const saveIcon = document.getElementById('saveLawyerIcon');
    const saveText = document.getElementById('saveLawyerText');

    if (currentUser && currentUser.role !== 'user') {
        if (saveBtn) {
            saveBtn.classList.remove('d-flex');
            saveBtn.classList.add('d-none');
        }

        // Also hide review modal button if it exists
        setTimeout(() => {
            const btnWriteReview = document.querySelector('[data-bs-target="#writeReviewModal"]');
            if (btnWriteReview) {
                btnWriteReview.classList.remove('d-flex', 'd-inline-block', 'd-block');
                btnWriteReview.classList.add('d-none');
            }
        }, 500);
    } else {
        if (saveBtn) {
            if (isLawyerSaved) {
                saveIcon.classList.remove('text-secondary');
                saveIcon.classList.add('text-danger');
                if (saveText) saveText.innerText = 'บันทึกแล้ว';
                saveBtn.title = 'บันทึกแล้ว';
            }

            saveBtn.addEventListener('click', async () => {
                if (!currentUser) {
                    await window.showBSAlert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนทำการบันทึก', 'warning');
                    window.location.href = '/sign_in';
                    return;
                }

                try {
                    const method = isLawyerSaved ? 'DELETE' : 'POST';
                    const res = await fetch('/users/favorites', {
                        method: method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: currentUser.id, lawyer_id: lawyerId })
                    });

                    if (res.ok) {
                        isLawyerSaved = !isLawyerSaved;
                        if (isLawyerSaved) {
                            saveIcon.classList.remove('text-secondary');
                            saveIcon.classList.add('text-danger');
                            if (saveText) saveText.innerText = 'บันทึกแล้ว';
                            saveBtn.title = 'บันทึกแล้ว';
                        } else {
                            saveIcon.classList.remove('text-danger');
                            saveIcon.classList.add('text-secondary');
                            if (saveText) saveText.innerText = 'บันทึกทนายความ';
                            saveBtn.title = 'ยังไม่บันทึก';
                        }
                    }
                } catch (err) {
                    console.error("Error toggling favorite:", err);
                    await window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
                }
            });
        }
    }

    try {
        const provRes = await fetch('/lawyer/provinces');
        const provinces = await provRes.json();

        const res = await fetch(`/lawyers/${lawyerId}/edit`);
        const data = await res.json();
        const p = data.profile;

        if (p.image_path) {
            const imgEl = document.getElementById('profileLaw');
            imgEl.src = p.image_path;
            imgEl.style.display = 'block';
        }
        document.getElementById('lawyerName').innerText = p.full_name || 'ไม่ระบุชื่อ';
        document.getElementById('licenseNum').innerText = `เลขที่ใบอนุญาต: ${p.license_number || '-'}`;

        const provName = provinces.find(prov => prov.id === p.province_id)?.name || 'ไม่ระบุจังหวัด';
        document.getElementById('locationProv').innerText = provName;

        let feeRateText = 'ไม่ระบุ';
        if (p.fee_rate) {
            const fee = parseInt(p.fee_rate, 10);
            if (fee <= 1000) feeRateText = '0 - 1,000 บาท';
            else if (fee <= 3000) feeRateText = '1,000 - 3,000 บาท';
            else if (fee <= 5000) feeRateText = '3,000 - 5,000 บาท';
            else feeRateText = 'เริ่มต้น 5,000 บาท';
        }
        document.getElementById('feeRate').innerText = feeRateText;

        document.getElementById('contactPhone').innerText = ` ${p.phone || '-'}`;
        document.getElementById('contactEmail').innerText = ` ${p.email || '-'}`;
        document.getElementById('contactLine').innerText = ` ${p.line_id || '-'}`;
        if (p.facebook_url && p.facebook_url !== '-') {
            document.getElementById('contactFacebook').innerHTML = ` <a href="${p.facebook_url}" target="_blank" class="text-decoration-none" style="color: #1A435A;">${p.facebook_url}</a>`;
        } else {
            document.getElementById('contactFacebook').innerText = ' -';
        }
        document.getElementById('address').innerText = p.office_address || 'ไม่ระบุที่อยู่';

        document.getElementById('address').innerText = p.office_address || 'ไม่ระบุที่อยู่';

        const skillBox = document.getElementById('skillBox');
        const modalList = document.getElementById('modalList');

        if (data.specialties && data.specialties.length > 0) {

            const badgeHTML = data.specialties.map(s =>
                `<span class="badge badge-expertise">${s.name}</span>`
            ).join('');

            const btnHTML = `
                <button id="btnMore" class="btn btn-link btn-sm text-decoration-none p-0 d-none " data-bs-toggle="modal" data-bs-target="#skillsModal">
                    ดูทั้งหมด...
                </button>`;

            skillBox.innerHTML = badgeHTML + btnHTML;
            modalList.innerHTML = badgeHTML;

            setTimeout(() => {
                const btnMore = document.getElementById('btnMore');

                if (skillBox.scrollHeight > skillBox.clientHeight) {
                    btnMore.classList.remove('d-none');

                    while (skillBox.scrollHeight > skillBox.clientHeight) {
                        const visibleBadges = skillBox.querySelectorAll('.badge:not(.d-none)');
                        if (visibleBadges.length === 0) break;

                        visibleBadges[visibleBadges.length - 1].classList.add('d-none');
                    }
                }
            }, 200);

        } else {
            skillBox.innerHTML = '<span class="text-muted small">ยังไม่มีข้อมูลหมวดหมู่คดี</span>';
        }

        const scheduleContainer = document.getElementById('serviceHours');
        const dayMapTH = {
            'monday': 'จันทร์', 'tuesday': 'อังคาร', 'wednesday': 'พุธ',
            'thursday': 'พฤหัสบดี', 'friday': 'ศุกร์', 'saturday': 'เสาร์', 'sunday': 'อาทิตย์'
        };

        if (data.schedules && data.schedules.length > 0) {
            scheduleContainer.innerHTML = data.schedules.map(s => {
                const dayName = dayMapTH[s.day_of_week.toLowerCase()] || s.day_of_week;
                if (s.is_open) {
                    const start = s.time_start.substring(0, 5);
                    const end = s.time_end.substring(0, 5);
                    return `<div class="d-flex justify-content-between mb-2"><span class="fw-medium" style="color: #1A435A;">วัน${dayName}</span><span class="fw-medium" style="color: #1A435A;">${start} - ${end}</span></div>`;
                } else {
                    return `<div class="d-flex justify-content-between mb-2"><span class="fw-medium" style="color: #1A435A;">วัน${dayName}</span><span class="text-danger fw-medium">ปิดทำการ</span></div>`;
                }
            }).join('');
        }

        const workContainer = document.getElementById('workhistoryTimeline');
        if (data.works && data.works.length > 0) {
            workContainer.classList.add('custom-timeline');
            workContainer.innerHTML = data.works.map(w => {
                const displayYearEnd = (!w.year_end || parseInt(w.year_end) >= currentYearTH) ?
                    'ปัจจุบัน' : w.year_end;
                return `
                <div class="timeline-item">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div class="timeline-title fw-bold">${w.job_position}</div>
                        <span class="timeline-date small">${w.year_start} - ${displayYearEnd}</span>
                    </div>
                    <p class="mb-0 small" style="color: #1A435A;">${w.company_name}</p>
                </div>`;
            }).join('');
        } else {
            workContainer.classList.remove('custom-timeline');
            workContainer.innerHTML = '<p class="text-muted text-center my-3">- ไม่มีข้อมูลประสบการณ์ทำงาน -</p>';
        }

        const achContainer = document.getElementById('achievementTimeline');
        if (data.achievements && data.achievements.length > 0) {
            achContainer.classList.add('custom-timeline');
            achContainer.innerHTML = data.achievements.map(a => {
                return `
                <div class="timeline-item">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div class="timeline-title fw-bold">${a.title}</div>
                        <span class="timeline-date small">${a.year || ''}</span>
                    </div>
                    <p class="mb-0 small" style="color: #1A435A;">${a.organization}</p>
                </div>`;
            }).join('');
        } else {
            achContainer.classList.remove('custom-timeline');
            achContainer.innerHTML = '<p class="text-muted text-center my-3">- ไม่มีข้อมูลผลงานและการอบรม -</p>';
        }

        const eduContainer = document.getElementById('educationTimeline');
        if (data.educations && data.educations.length > 0) {
            eduContainer.classList.add('custom-timeline');
            eduContainer.innerHTML = data.educations.map(e => {
                const displayYearEnd = (!e.year_end || parseInt(e.year_end) >= currentYearTH) ?
                    'ปัจจุบัน' : e.year_end;
                return `
                <div class="timeline-item">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div class="timeline-title fw-bold">${e.degree}</div>
                        <span class="timeline-date small">${e.year_start} - ${e.year_end || 'ปัจจุบัน'}</span>
                    </div>
                    <p class="mb-0 small" style="color: #1A435A;">${e.university}</p>
                </div>`;
            }).join('');
        } else {
            eduContainer.classList.remove('custom-timeline');
            eduContainer.innerHTML = '<p class="text-muted text-center my-3">- ไม่มีข้อมูลประวัติการศึกษา -</p>';
        }

    } catch (err) {
        console.error('Error fetching lawyer data:', err);
    }


    const reviewBox = document.getElementById('reviewBox');

    async function loadReviews() {
        if (!reviewBox) return;
        try {
            const res = await fetch(`/lawyers/${lawyerId}/reviews`);
            if (!res.ok) throw new Error("Failed to fetch reviews");
            currentLawyerReviews = await res.json();

            updateReviewSummary(currentLawyerReviews);
            renderFilteredReviews();
        } catch (err) {
            console.error(err);
            reviewBox.innerHTML = '<div class="col-12 text-center text-danger py-4">เกิดข้อผิดพลาดในการโหลดรีวิว</div>';
        }
    }

    function updateReviewSummary(reviews) {
        const titleCountEl = document.getElementById('reviewTitleCount');
        if (titleCountEl) titleCountEl.innerText = `รีวิวและความคิดเห็นทั้งหมด (${reviews.length})`;

        const rankScoreEl = document.getElementById('rankScore');
        const sumReviewEl = document.getElementById('sumReview');
        const starRankEl = document.getElementById('starRank');

        const summaryAvgRating = document.getElementById('summaryAvgRating');
        const summaryStarsHTML = document.getElementById('summaryStarsHTML');

        let roundedAvg = 0;
        let counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        if (reviews.length > 0) {
            const sum = reviews.reduce((acc, r) => {
                counts[r.rating] = (counts[r.rating] || 0) + 1;
                return acc + r.rating;
            }, 0);
            const avg = sum / reviews.length;
            roundedAvg = Math.round(avg * 10) / 10;
        }

        if (rankScoreEl) rankScoreEl.innerText = roundedAvg.toFixed(1);
        if (sumReviewEl) sumReviewEl.innerText = `(${reviews.length} รีวิว)`;
        if (summaryAvgRating) summaryAvgRating.innerText = roundedAvg.toFixed(1);

        const total = reviews.length || 1;
        for (let i = 1; i <= 5; i++) {
            const bar = document.getElementById(`bar${i}`);
            if (bar) {
                const pct = (counts[i] / total) * 100;
                bar.style.width = `${pct}%`;
            }
        }

        const getStars = (avg) => {
            let overallStars = '';
            const fullStars = Math.floor(avg);
            const hasHalf = avg % 1 >= 0.5;
            for (let i = 1; i <= 5; i++) {
                if (i <= fullStars) {
                    overallStars += '<i class="fa-solid fa-star text-warning"></i>';
                } else if (i === fullStars + 1 && hasHalf) {
                    overallStars += '<i class="fa-solid fa-star-half-stroke text-warning"></i>';
                } else {
                    overallStars += '<i class="fa-regular fa-star text-muted opacity-25"></i>';
                }
            }
            return overallStars;
        };

        if (starRankEl) starRankEl.innerHTML = getStars(roundedAvg);
        if (summaryStarsHTML) summaryStarsHTML.innerHTML = getStars(roundedAvg);

        const toggleContainer = document.getElementById('reviewToggleContainer');
        if (toggleContainer) {
            if (reviews.length > 0) toggleContainer.style.display = 'flex';
            else toggleContainer.style.display = 'none';
        }
    }

    window.renderFilteredReviews = renderFilteredReviews;
    function renderFilteredReviews() {
        if (!reviewBox) return;

        let filtered = [...currentLawyerReviews];

        const ratingFilter = document.getElementById('reviewRatingSelect')?.value;
        const sortFilter = document.getElementById('reviewSortSelect')?.value;

        if (ratingFilter) {
            if (ratingFilter === '1-3') {
                filtered = filtered.filter(r => r.rating >= 1 && r.rating <= 3);
            } else {
                const rVal = parseInt(ratingFilter, 10);
                filtered = filtered.filter(r => r.rating === rVal);
            }
        }

        if (sortFilter) {
            if (sortFilter === 'newest') {
                filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            } else if (sortFilter === 'oldest') {
                filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            } else if (sortFilter === 'rating-high') {
                filtered.sort((a, b) => b.rating - a.rating);
            } else if (sortFilter === 'rating-low') {
                filtered.sort((a, b) => a.rating - b.rating);
            }
        }

        if (filtered.length === 0) {
            reviewBox.innerHTML = '<div class="col-12 text-center text-muted py-4">ไม่พบรีวิวที่ตรงกับเงื่อนไข</div>';
            return;
        }

        reviewBox.innerHTML = filtered.map(review => {
            let starsHtml = '';
            for (let i = 1; i <= 5; i++) {
                if (i <= review.rating) {
                    starsHtml += '<i class="fa-solid fa-star text-warning"></i>';
                } else {
                    starsHtml += '<i class="fa-regular fa-star text-muted opacity-25"></i>';
                }
            }

            const displayName = `${review.user_first} ${review.user_last}`;
            const imgHTML = review.user_image
                ? `<img src="${review.user_image}" class="rounded-circle border" width="48" height="48" alt="User" style="object-fit: cover;">`
                : `<div class="d-flex justify-content-center align-items-center bg-light rounded-circle border" style="width: 48px; height: 48px;"><i class="fa-solid fa-user" style="font-size: 24px; color: #dee2e6;"></i></div>`;
            const dateFormatted = new Date(review.created_at).toLocaleDateString('th-TH', {
                year: 'numeric', month: 'short', day: 'numeric'
            });

            let replyHtml = '';
            if (review.reply) {
                const repliedAt = review.replied_at ? new Date(review.replied_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : '';
                let lawyerNameStr = 'ทนายความ';
                const lawyerNameEl = document.getElementById('lawyerName');
                if (lawyerNameEl && lawyerNameEl.innerText) lawyerNameStr = lawyerNameEl.innerText;

                replyHtml = `
                    <div class="mt-3 p-3 bg-light rounded-4 border-0 position-relative">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div class="d-flex align-items-center">
                                <i class="fa-solid fa-reply fa-rotate-180 text-dark me-2" style="font-size: 1.1rem;"></i>
                                <span class="fw-bold text-dark">${lawyerNameStr}</span>
                            </div>
                            <div class="d-flex align-items-center gap-3">
                                <small class="text-muted" style="font-size: 0.85rem;">${repliedAt}</small>
                                <i class="fa-regular fa-flag text-muted" title="รายงานการตอบกลับนี้" style="cursor: pointer; transition: 0.2s;" onmouseover="this.classList.replace('text-muted', 'text-danger')" onmouseout="this.classList.replace('text-danger', 'text-muted')" onclick="openReportModal(${review.id}, 'reply', '${review.status}')"></i>
                            </div>
                        </div>
                        <div class="review-text-container d-flex flex-column align-items-start w-100" style="padding-left: 1.8rem;">
                            <p class="mb-1 text-dark text-clamp-2 review-comment w-100 text-start" style="font-size: 0.95rem;">${review.reply}</p>
                            <a href="javascript:void(0)" class="text-dark text-decoration-none fw-bold small read-more-btn" style="display: none;">เพิ่มเติม</a>
                        </div>
                    </div>
                `;
            } else if (currentUser && currentUser.role === 'lawyer' && String(currentUser.id) === String(lawyerId)) {
                replyHtml = `
                <div class="d-flex justify-content-start mt-2">
                    <button class="btn btn-link text-decoration-none p-0 fw-bold text-dark" style="font-size: 0.95rem;" onclick="toggleReplyBox(${review.id})">
                        <i class="fa-solid fa-reply me-1"></i>ตอบกลับ
                    </button>
                </div>
                <div id="replyBoxContainer-${review.id}" class="mt-2 p-3 rounded-4" style="display: none; background-color: #f8fafc; border: 1px solid #e2e8f0;">
                    <textarea class="form-control bg-white text-dark border p-3 mb-2" id="inlineReply-${review.id}" rows="1" placeholder="พิมพ์ข้อความตอบกลับที่นี่..." style="border-radius: 12px; resize: none; overflow: hidden;" oninput="this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px';"></textarea>
                    <div class="d-flex justify-content-end align-items-center">
                        <button class="btn rounded-pill px-4 text-white" style="background-color: #4987A4; font-size: 1rem;" onclick="submitInlineReply(${review.id})">
                            ส่ง
                        </button>
                    </div>
                </div>
                `;
            }

            let commentHtml = '';
            if (review.comment && review.comment.trim() !== '') {
                commentHtml = `
                    <div class="review-text-container d-flex flex-column align-items-start mb-3 w-100">
                        <p class="mb-0 text-dark text-clamp-2 review-comment w-100 text-start" style="font-size: 0.95rem;">${review.comment}</p>
                        <a href="javascript:void(0)" class="text-dark text-decoration-none fw-bold small read-more-btn" style="display: none;">เพิ่มเติม</a>
                    </div>
                `;
            }

            return `
                <div class="w-100">
                    <div class="card border-0 shadow-sm p-4">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div class="d-flex align-items-center gap-3">
                                ${imgHTML}
                                <div>
                                    <div class="fw-bold mb-0" style="font-size: 0.95rem;">${displayName}</div>
                                    <small class="text-muted" style="font-size: 0.8rem;">${dateFormatted}</small>
                                </div>
                            </div>
                            <div class="ms-auto">
                                <i class="fa-regular fa-flag text-muted" title="รายงานรีวิวนี้" style="cursor: pointer; transition: 0.2s;" onmouseover="this.classList.replace('text-muted', 'text-danger')" onmouseout="this.classList.replace('text-danger', 'text-muted')" onclick="openReportModal(${review.id}, 'review', '${review.status}')"></i>
                            </div>
                        </div>
                        <div class="fs-6 ${commentHtml || replyHtml ? 'mb-3' : 'mb-0'}">${starsHtml}</div>
                        ${commentHtml}
                        ${replyHtml}
                    </div>
                </div>
            `;
        }).join('');

        // Setup Read More buttons
        const containers = reviewBox.querySelectorAll('.review-text-container');
        containers.forEach(container => {
            const p = container.querySelector('.review-comment');
            const btn = container.querySelector('.read-more-btn');
            if (p && btn && p.scrollHeight > p.clientHeight) {
                btn.style.display = 'inline-block';
                btn.addEventListener('click', () => {
                    if (p.classList.contains('text-clamp-2')) {
                        p.classList.remove('text-clamp-2');
                        container.classList.add('expanded');
                        btn.innerText = 'ซ่อน';
                    } else {
                        p.classList.add('text-clamp-2');
                        container.classList.remove('expanded');
                        btn.innerText = 'เพิ่มเติม';
                    }
                });
            }
        });
    }

    const ratingSelect = document.getElementById('reviewRatingSelect');
    const sortSelect = document.getElementById('reviewSortSelect');
    if (ratingSelect) ratingSelect.addEventListener('change', renderFilteredReviews);
    if (sortSelect) sortSelect.addEventListener('change', renderFilteredReviews);

    await loadReviews();

    const btnToggleReviews = document.getElementById('btnToggleReviews');
    if (btnToggleReviews && reviewBox) {
        btnToggleReviews.addEventListener('click', () => {
            if (reviewBox.classList.contains('flex-nowrap')) {
                // Expand to grid
                reviewBox.classList.remove('flex-nowrap');
                reviewBox.classList.add('flex-wrap', 'justify-content-center');
                btnToggleReviews.innerText = 'ย่อรีวิว';
            } else {
                // Collapse back to horizontal scroll
                reviewBox.classList.remove('flex-wrap', 'justify-content-center');
                reviewBox.classList.add('flex-nowrap');
                btnToggleReviews.innerText = 'ดูรีวิวทั้งหมด';
            }
        });
    }

    // 2. Interactive Star Rating Logic for Modal
    const stars = document.querySelectorAll('#reviewStarRating .fa-star');
    const ratingInput = document.getElementById('selectedRating');

    stars.forEach(star => {
        // Hover effect
        star.addEventListener('mouseover', function () {
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(rating);
        });

        // Mouse out effect
        star.parentElement.addEventListener('mouseout', function () {
            const currentRating = parseInt(ratingInput.value);
            highlightStars(currentRating);
        });

        // Click effect
        star.addEventListener('click', function () {
            const rating = parseInt(this.getAttribute('data-rating'));
            ratingInput.value = rating;
            highlightStars(rating);
        });
    });

    function highlightStars(rating) {
        stars.forEach(s => {
            const sRating = parseInt(s.getAttribute('data-rating'));
            if (sRating <= rating) {
                s.classList.remove('fa-regular');
                s.classList.add('fa-solid');
            } else {
                s.classList.remove('fa-solid');
                s.classList.add('fa-regular');
            }
        });
    }

    // 3. Handle Review Submit from Modal
    const reviewForm = document.getElementById('addReviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentUser) {
                await window.showBSAlert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อนทำการรีวิว', 'warning');
                window.location.href = '/sign_in';
                return;
            }

            const rating = ratingInput.value;
            const comment = document.getElementById('reviewComment').value;
            // The isAnonymous is intentionally ignored for backend submission for now, 
            // since DB doesn't support it yet.

            if (rating === "0") {
                await window.showBSAlert('แจ้งเตือน', 'กรุณาให้คะแนนดาวอย่างน้อย 1 ดาวก่อนบันทึกรีวิว', 'warning');
                return;
            }

            try {
                const res = await fetch(`/lawyers/${lawyerId}/reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        client_id: currentUser.id,
                        rating: parseInt(rating),
                        comment: comment
                    })
                });

                if (res.ok) {
                    window.showBSToast('บันทึกรีวิวเรียบร้อยแล้ว', 'success');

                    // ปิด Modal
                    const modalEl = document.getElementById('writeReviewModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();

                    // Reset form
                    reviewForm.reset();
                    ratingInput.value = "0";
                    highlightStars(0);

                    // Reload reviews
                    await loadReviews();
                } else {
                    const errData = await res.json();
                    await window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาด: ' + (errData.error || 'ไม่สามารถบันทึกรีวิวได้'), 'error');
                }
            } catch (err) {
                console.error("Error submitting review:", err);
                await window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
            }
        });
    }

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
                    window.showBSToast('รายงานสำเร็จ', 'success');

                    const modalEl = document.getElementById('reportModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();

                    reportForm.reset();
                } else {
                    const errData = await res.json();
                    await window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาด: ' + (errData.error || 'ไม่สามารถรายงานได้'), 'error');
                }
            } catch (err) {
                console.error("Error submitting report:", err);
                await window.showBSAlert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
            }
        });
    }
}; // end of window.onload

// Global functions
window.toggleReplyBox = function(reviewId) {
    const box = document.getElementById(`replyBoxContainer-${reviewId}`);
    if (box) {
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
    }
};

window.submitInlineReply = async function(reviewId) {
    const replyInput = document.getElementById(`inlineReply-${reviewId}`);
    if (!replyInput) return;
    
    const replyText = replyInput.value.trim();
    
    if (replyText === '') {
        window.showBSAlert('คำเตือน', 'กรุณากรอกข้อความตอบกลับก่อนส่ง', 'warning');
        return;
    }
    
    if (replyText.length > 500) {
        window.showBSAlert('ข้อความยาวเกินไป', 'ข้อความตอบกลับยาวเกินไป (ไม่เกิน 500 ตัวอักษร)', 'warning');
        return;
    }

    try {
        const res = await fetch(`/lawyers/${lawyerId}/reviews/${reviewId}/reply`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ reply: replyText })
        });
        
        if (res.ok) {
            const reviewIndex = currentLawyerReviews.findIndex(r => r.id === reviewId);
            if (reviewIndex !== -1) {
                currentLawyerReviews[reviewIndex].reply = replyText;
                currentLawyerReviews[reviewIndex].replied_at = new Date().toISOString();
                renderFilteredReviews();
                window.showBSToast('ส่งข้อความตอบกลับสำเร็จ', 'success');
            }
        } else {
            const errData = await res.json();
            window.showBSAlert('เกิดข้อผิดพลาด', errData.error || 'ไม่สามารถตอบกลับได้', 'error');
        }
    } catch (err) {
        console.error(err);
        window.showBSAlert('เกิดข้อผิดพลาด', 'ไม่สามารถตอบกลับได้', 'error');
    }
};

window.openReportModal = function (reviewId, target, status) {
    if (status === 'reported') {
        window.showBSAlert('แจ้งเตือน', 'เนื้อหานี้ถูกรายงานไปแล้วและกำลังรอการตรวจสอบจากผู้ดูแลระบบ', 'warning');
        return;
    }
    Auth.requireLoginAction(() => {
        document.getElementById('reportReviewId').value = reviewId;
        document.getElementById('reportTarget').value = target;
        document.getElementById('reportReason').value = '';
        const modal = new bootstrap.Modal(document.getElementById('reportModal'));
        modal.show();
    });
};
