window.onload = async () => {
    let lawyerId = null;

    if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) {
        const user = Auth.getUser();
        if (user.role !== 'lawyer') {
            alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
            window.location.href = '/search.html';
            return;
        }
        lawyerId = user.id;
    } else {
        alert('กรุณาเข้าสู่ระบบก่อน');
        window.location.href = '/login.html';
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/lawyers/${lawyerId}/edit`);
        if (!response.ok) throw new Error('Failed to fetch lawyer profile');
        const data = await response.json();
        const p = data.profile;

        if (p.status === 'approved' && sessionStorage.getItem('lawyerApprovedNotified') !== 'true') {
            Swal.fire({
                title: 'ยินดีด้วย!',
                text: 'บัญชีของคุณได้รับการอนุมัติแล้ว',
                icon: 'success',
                confirmButtonText: 'ตกลง'
            });
            sessionStorage.setItem('lawyerApprovedNotified', 'true');
        }

        document.getElementById('dashName').textContent = 'คุณ ' + (p.full_name || '-');
        document.getElementById('dashLicense').textContent = `เลขที่ใบอนุญาต: ${p.license_number || '-'}`;
        document.getElementById('dashEmail').textContent = p.email || '-';
        document.getElementById('dashPhone').textContent = p.phone || '-';
        document.getElementById('dashLine').textContent = p.line_id || '-';
        
        if (p.facebook_url) {
            document.getElementById('dashFacebook').innerHTML = `<a href="${p.facebook_url}" target="_blank">${p.facebook_url}</a>`;
        } else {
            document.getElementById('dashFacebook').textContent = '-';
        }

        // dashProvince removed
        document.getElementById('dashAddress').textContent = p.office_address || '-';

        if (p.image_path) {
            const headerPicEl = document.getElementById('headerPic');
            if (headerPicEl) headerPicEl.src = p.image_path;
            document.getElementById('dashProfileImg').src = p.image_path;
        }

        if (p.license_file) {
            document.getElementById('dashLicenseFile').innerHTML = `<a href="${p.license_file}" download class="btn btn-sm btn-outline-primary"><i class="fa-solid fa-file-arrow-down me-1"></i> ดาวน์โหลดไฟล์</a>`;
        }

        const tagsContainer = document.getElementById('dashCategories');
        tagsContainer.innerHTML = '';
        if (data.specialties && data.specialties.length > 0) {
            data.specialties.forEach(spec => {
                const span = document.createElement('span');
                span.className = 'badge rounded-pill bg-primary bg-opacity-10 text-primary border border-primary px-3 py-2';
                span.textContent = spec.name;
                tagsContainer.appendChild(span);
            });
        } else {
            tagsContainer.innerHTML = '<span class="text-muted">ยังไม่ได้ระบุหมวดหมู่คดี</span>';
        }

        // 1. Fee Rate
        if (p.fee_rate) {
            document.getElementById('dashFeeRate').innerHTML = `<p class="fw-bold mb-0">${p.fee_rate} บาท</p>`;
        }

        // 2. Educations
        const eduContainer = document.getElementById('dashEducations');
        if (data.educations && data.educations.length > 0) {
            let eduHtml = '<ul class="list-unstyled mb-0">';
            data.educations.forEach(edu => {
                const start = edu.year_start || '-';
                const end = edu.year_end || 'ปัจจุบัน';
                eduHtml += `<li class="mb-2"><i class="fa-solid fa-circle text-warning me-2" style="font-size: 0.5rem;"></i><span class="fw-semibold">${edu.degree}</span> - ${edu.university} (${start} - ${end})</li>`;
            });
            eduHtml += '</ul>';
            eduContainer.innerHTML = eduHtml;
        }

        // 3. Works
        const workContainer = document.getElementById('dashWorks');
        if (data.works && data.works.length > 0) {
            let workHtml = '<ul class="list-unstyled mb-0">';
            data.works.forEach(w => {
                const start = w.year_start || '-';
                const end = w.year_end || 'ปัจจุบัน';
                workHtml += `<li class="mb-2"><i class="fa-solid fa-circle text-info me-2" style="font-size: 0.5rem;"></i><span class="fw-semibold">${w.job_position}</span> - ${w.company_name} <span class="text-muted small">(${start} - ${end})</span></li>`;
            });
            workHtml += '</ul>';
            workContainer.innerHTML = workHtml;
        }

        // 4. Schedules
        const scheduleContainer = document.getElementById('dashSchedules');
        if (data.schedules && data.schedules.length > 0) {
            scheduleContainer.innerHTML = '<div class="table-responsive"><table class="table table-sm table-borderless mb-0"><tbody>';
            const dayMap = {
                monday: 'จันทร์', tuesday: 'อังคาร', wednesday: 'พุธ', 
                thursday: 'พฤหัสบดี', friday: 'ศุกร์', saturday: 'เสาร์', sunday: 'อาทิตย์'
            }; 
            data.schedules.forEach(s => {
                const dayKey = (s.day_of_week || '').toLowerCase();
                const thaiDay = dayMap[dayKey] || s.day_of_week;
                const status = s.is_open ? `<span class="text-success fw-bold">เปิด</span> (${s.time_start.substring(0,5)} - ${s.time_end.substring(0,5)})` : '<span class="text-danger fw-bold">ปิดทำการ</span>';
                scheduleContainer.querySelector('tbody').innerHTML += `
                    <tr>
                        <td class="fw-semibold text-muted w-25">วัน${thaiDay}</td>
                        <td>${status}</td>
                    </tr>
                `;
            });
            scheduleContainer.innerHTML += '</tbody></table></div>';
        }

    } catch (err) {
        console.error(err);
        alert('ไม่สามารถโหลดข้อมูลทนายความได้');
    }
};
