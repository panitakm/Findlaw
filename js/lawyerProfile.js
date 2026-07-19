const lawyerId = 1; // ID ของทนายที่ต้องการแสดง
const currentYearTH = new Date().getFullYear() + 543;

window.onload = async () => {
    try {
        const provRes = await fetch('http://localhost:3000/lawyer/provinces');
        const provinces = await provRes.json();

        const res = await fetch(`http://localhost:3000/lawyers/${lawyerId}/edit`);
        const data = await res.json();
        const p = data.profile;

        if (p.image_path) {
            document.getElementById('profileLaw').src = p.image_path;
        }
        document.getElementById('lawyerName').innerText = p.full_name || 'ไม่ระบุชื่อ';
        document.getElementById('licenseNum').innerText = `เลขที่ใบอนุญาต: ${p.license_number || '-'}`;
        
        const provName = provinces.find(prov => prov.id === p.province_id)?.name || 'ไม่ระบุจังหวัด';
        document.getElementById('locationProv').innerText = provName;

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
                <button id="btnMore" class="btn btn-link btn-sm text-decoration-none p-0 d-none" data-bs-toggle="modal" data-bs-target="#skillsModal">
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
                    return `<div class="d-flex justify-content-between mb-2"><span>วัน${dayName}</span><span class="fw-normal">${start} - ${end}</span></div>`;
                } else {
                    return `<div class="d-flex justify-content-between mb-2"><span>วัน${dayName}</span><span class="text-danger fw-bolder ">ปิดทำการ</span></div>`;
                }
            }).join('');
        }

    const workContainer = document.getElementById('workhistoryTimeline');
    if (data.works && data.works.length > 0) {
        workContainer.innerHTML = data.works.map(w => {
            const displayYearEnd = (!w.year_end || parseInt(w.year_end) >= currentYearTH) ? 
                'ปัจจุบัน' : w.year_end;
            return `
                <div class="timeline-item">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div class="timeline-title fw-bold">${w.job_position}</div>
                        <span class="timeline-date small text-muted">${w.year_start} - ${displayYearEnd}</span>
                    </div>
                    <p class="text-muted mb-0 small">${w.company_name}</p>
                </div>`;
        }).join('');
    } else {
        workContainer.innerHTML = '<p class="text-muted small">ยังไม่มีข้อมูลประสบการณ์การทำงาน</p>';
    }

    const eduContainer = document.getElementById('educationTimeline');
    if (data.educations && data.educations.length > 0) {
        eduContainer.innerHTML = data.educations.map(e => {
            const displayYearEnd = (!e.year_end || parseInt(e.year_end) >= currentYearTH) ?
                'ปัจจุบัน' : e.year_end;
            return `
                <div class="timeline-item">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div class="timeline-title fw-bold">${e.degree}</div>
                        <span class="timeline-date small text-muted">${e.year_start} - ${e.year_end || 'ปัจจุบัน'}</span>
                    </div>
                    <p class="text-muted mb-0 small">${e.university}</p>
                </div>`;
        }).join('');
    } else {
        eduContainer.innerHTML = '<p class="text-muted small">ยังไม่มีข้อมูลประวัติการศึกษา</p>';
    }

    } catch (err) {
        console.error('Error fetching lawyer data:', err);
    }
};