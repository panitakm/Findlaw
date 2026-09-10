const urlParams = new URLSearchParams(window.location.search);
const lawyerId = urlParams.get('id'); // ดึง ID จาก URL (?id=...)
const currentYearTH = new Date().getFullYear() + 543;

let currentUser = null;
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
        alert("ไม่พบรหัสทนายความ กรุณากลับไปหน้าค้นหา");
        window.location.href = '/search.html';
        return;
    }

    if (currentUser) {
        try {
            const res = await fetch(`http://localhost:3000/users/${currentUser.id}/favorites`);
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
                    alert("กรุณาเข้าสู่ระบบก่อนทำการบันทึก");
                    window.location.href = '/login.html';
                    return;
                }

            try {
                const method = isLawyerSaved ? 'DELETE' : 'POST';
                const res = await fetch('http://localhost:3000/users/favorites', {
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
                alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
            }
        });
    }
}

    try {
        const provRes = await fetch('http://localhost:3000/lawyer/provinces');
        const provinces = await provRes.json();

        const res = await fetch(`http://localhost:3000/lawyers/${lawyerId}/edit`);
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
        document.getElementById('contactFacebook').innerText = ` ${p.facebook_url || '-'}`;
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
        workContainer.innerHTML = '<p class="text-muted text-center my-3">-ไม่มีข้อมูลประสบการณ์การทำงาน-</p>';
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
        eduContainer.innerHTML = '<p class="text-muted text-center my-3">-ไม่มีข้อมูลประวัติการศึกษา-</p>';
    }

    } catch (err) {
        console.error('Error fetching lawyer data:', err);
    }

    // ----------------------------------------------------
    // Review Section Logic
    // ----------------------------------------------------

    // 1. Fetch Real Data & Render Reviews in #reviewBox
    const reviewBox = document.getElementById('reviewBox');
    
    async function loadReviews() {
        if (!reviewBox) return;
        try {
            const res = await fetch(`http://localhost:3000/lawyers/${lawyerId}/reviews`);
            if (!res.ok) throw new Error("Failed to fetch reviews");
            const reviews = await res.json();
            
            const rankScoreEl = document.getElementById('rankScore');
            const sumReviewEl = document.getElementById('sumReview');
            const starRankEl = document.getElementById('starRank');

            if (reviews.length > 0) {
                const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
                const avg = sum / reviews.length;
                const roundedAvg = Math.round(avg * 10) / 10;
                
                if (rankScoreEl) rankScoreEl.innerText = roundedAvg.toFixed(1);
                if (sumReviewEl) sumReviewEl.innerText = `(${reviews.length} รีวิว)`;
                
                const titleCountEl = document.getElementById('reviewTitleCount');
                if (titleCountEl) titleCountEl.innerText = `รีวิวและความคิดเห็น (${reviews.length})`;

                if (reviews.length > 1) {
                    const toggleContainer = document.getElementById('reviewToggleContainer');
                    if (toggleContainer) toggleContainer.style.display = 'block';
                }
                
                if (starRankEl) {
                    let overallStars = '';
                    const fullStars = Math.floor(roundedAvg);
                    const hasHalf = roundedAvg % 1 >= 0.5;
                    for (let i = 1; i <= 5; i++) {
                        if (i <= fullStars) {
                            overallStars += '<i class="fa-solid fa-star text-warning"></i>';
                        } else if (i === fullStars + 1 && hasHalf) {
                            overallStars += '<i class="fa-solid fa-star-half-stroke text-warning"></i>';
                        } else {
                            overallStars += '<i class="fa-regular fa-star text-muted opacity-25"></i>';
                        }
                    }
                    starRankEl.innerHTML = overallStars;
                }

                reviewBox.innerHTML = reviews.map(review => {
                    let starsHtml = '';
                    for(let i = 1; i <= 5; i++) {
                        if(i <= review.rating) {
                            starsHtml += '<i class="fa-solid fa-star text-warning"></i>';
                        } else {
                            starsHtml += '<i class="fa-regular fa-star text-muted opacity-25"></i>';
                        }
                    }

                    // For now, there's no anonymous column in DB, so we display real name
                    const displayName = `${review.user_first} ${review.user_last}`;
                    const avatarSrc = review.user_image || "/css/pic/person-circle.svg";
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
                                        ${review.status === 'reported' ? '<i class="fa-solid fa-flag text-danger" title="รอการตรวจสอบจากผู้ดูแลระบบ"></i>' : `<i class="fa-regular fa-flag text-muted" title="รายงานการตอบกลับนี้" style="cursor: pointer; transition: 0.2s;" onmouseover="this.classList.replace('text-muted', 'text-danger')" onmouseout="this.classList.replace('text-danger', 'text-muted')" onclick="openReportModal(${review.id}, 'reply')"></i>`}
                                    </div>
                                </div>
                                <div style="padding-left: 1.8rem;">
                                    <p class="mb-1 text-dark" style="font-size: 0.95rem;">${review.reply}</p>
                                </div>
                            </div>
                        `;
                    }

                    return `
                        <div style="min-width: 340px; width: 340px; scroll-snap-align: start;">
                            <div class="card border-0 shadow-sm p-4 h-100 d-flex flex-column">
                                <div class="d-flex justify-content-between align-items-start mb-3">
                                    <div class="d-flex align-items-center gap-3">
                                        <img src="${avatarSrc}" class="rounded-circle border" width="48" height="48" alt="User" style="object-fit: cover;">
                                        <div>
                                            <div class="fw-bold mb-0" style="font-size: 0.95rem;">${displayName}</div>
                                            <small class="text-muted" style="font-size: 0.8rem;">${dateFormatted}</small>
                                        </div>
                                    </div>
                                    <div class="ms-auto">
                                        ${review.status === 'reported' ? '<i class="fa-solid fa-flag text-danger" title="รอการตรวจสอบจากผู้ดูแลระบบ"></i>' : `<i class="fa-regular fa-flag text-muted" title="รายงานรีวิวนี้" style="cursor: pointer; transition: 0.2s;" onmouseover="this.classList.replace('text-muted', 'text-danger')" onmouseout="this.classList.replace('text-danger', 'text-muted')" onclick="openReportModal(${review.id}, 'review')"></i>`}
                                    </div>
                                </div>
                                <div class="fs-6 mb-3">${starsHtml}</div>
                                <p class="mb-3 text-dark flex-grow-1" style="font-size: 0.95rem;">${review.comment || ''}</p>
                                
                                ${replyHtml}
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                if (rankScoreEl) rankScoreEl.innerText = '0.0';
                if (sumReviewEl) sumReviewEl.innerText = '(0 รีวิว)';
                if (starRankEl) starRankEl.innerHTML = '<i class="fa-regular fa-star text-muted opacity-25"></i><i class="fa-regular fa-star text-muted opacity-25"></i><i class="fa-regular fa-star text-muted opacity-25"></i><i class="fa-regular fa-star text-muted opacity-25"></i><i class="fa-regular fa-star text-muted opacity-25"></i>';
                reviewBox.innerHTML = '<div class="col-12 text-center text-muted py-4">ยังไม่มีรีวิว</div>';
            }
        } catch (err) {
            console.error(err);
            reviewBox.innerHTML = '<div class="col-12 text-center text-danger py-4">เกิดข้อผิดพลาดในการโหลดรีวิว</div>';
        }
    }
    
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
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.getAttribute('data-rating'));
            highlightStars(rating);
        });

        // Mouse out effect
        star.parentElement.addEventListener('mouseout', function() {
            const currentRating = parseInt(ratingInput.value);
            highlightStars(currentRating);
        });

        // Click effect
        star.addEventListener('click', function() {
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
                alert("กรุณาเข้าสู่ระบบก่อนทำการรีวิว");
                window.location.href = '/login.html';
                return;
            }

            const rating = ratingInput.value;
            const comment = document.getElementById('reviewComment').value;
            // The isAnonymous is intentionally ignored for backend submission for now, 
            // since DB doesn't support it yet.
            
            if(rating === "0") {
                alert("กรุณาให้คะแนนดาวอย่างน้อย 1 ดาวก่อนบันทึกรีวิว");
                return;
            }
            
            try {
                const res = await fetch(`http://localhost:3000/lawyers/${lawyerId}/reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        client_id: currentUser.id,
                        rating: parseInt(rating),
                        comment: comment
                    })
                });

                if (res.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'สำเร็จ',
                        text: 'บันทึกรีวิวเรียบร้อยแล้ว',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    
                    // ปิด Modal
                    const modalEl = document.getElementById('writeReviewModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if(modal) modal.hide();

                    // Reset form
                    reviewForm.reset();
                    ratingInput.value = "0";
                    highlightStars(0);
                    
                    // Reload reviews
                    await loadReviews();
                } else {
                    const errData = await res.json();
                    alert("เกิดข้อผิดพลาด: " + (errData.error || "ไม่สามารถบันทึกรีวิวได้"));
                }
            } catch (err) {
                console.error("Error submitting review:", err);
                alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
            }
        });
    }
    
    // ----------------------------------------------------
    // Report Form Submit Logic
    // ----------------------------------------------------
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
                        text: 'ส่งรายงานความไม่เหมาะสมเรียบร้อยแล้ว แอดมินจะดำเนินการตรวจสอบต่อไป',
                        timer: 3000,
                        showConfirmButton: false
                    });
                    
                    const modalEl = document.getElementById('reportModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                    
                    reportForm.reset();
                    await loadReviews();
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
};

// Global function to open the Report Modal
window.openReportModal = function(reviewId, target) {
    Auth.requireLoginAction(() => {
        document.getElementById('reportReviewId').value = reviewId;
        document.getElementById('reportTarget').value = target;
        document.getElementById('reportReason').value = '';
        const modal = new bootstrap.Modal(document.getElementById('reportModal'));
        modal.show();
    });
};