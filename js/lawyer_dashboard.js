window.onload = async () => {
    let lawyerId = null;

    if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) {
        const user = Auth.getUser();
        if (user.role !== 'lawyer') {
            await window.showBSAlert('แจ้งเตือน', 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 'warning');
            window.location.href = '/';
            return;
        }
        lawyerId = user.id;
    } else {
        await window.showBSAlert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อน', 'warning');
        window.location.href = '/sign_in';
        return;
    }

    try {
        const response = await fetch(`/lawyers/${lawyerId}/edit`);
        if (!response.ok) throw new Error('Failed to fetch lawyer profile');
        const data = await response.json();
        const p = data.profile;

        if (p.status === 'pending') {
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.innerHTML = `
                    <div class="d-flex align-items-center justify-content-center" style="min-height: 100vh; background-color: #f8f9fa;">
                        <div class="card border-0 shadow-sm rounded-4 p-5 text-center" style="max-width: 500px; width: 90%;">
                            <i class="fa-solid fa-clock-rotate-left fa-4x text-warning mb-4"></i>
                            <h4 class="fw-bold mb-3">บัญชีของคุณอยู่ระหว่างรอตรวจสอบ</h4>
                            <p class="text-muted mb-0">กรุณารอแอดมินตรวจสอบข้อมูลของคุณ <br>หากได้รับการอนุมัติแล้ว ถึงจะสามารถใช้งานระบบได้</p>
                        </div>
                    </div>
                `;
            }
            document.querySelectorAll('.sidebar-nav-list a').forEach(a => {
                a.style.pointerEvents = 'none';
                a.style.opacity = '0.5';
            });

            return;
        }

        if (p.status === 'rejected') {
            const mainContent = document.querySelector('main');
            if (mainContent) {
                 mainContent.innerHTML = `
                    <div class="d-flex align-items-center justify-content-center" style="min-height: 100vh; background-color: #f8f9fa;">
                        <div class="card border-0 shadow-sm rounded-4 p-5 text-center" style="max-width: 500px; width: 90%;">
                            <i class="fa-solid fa-circle-xmark fa-4x text-danger mb-4"></i>
                            <h3 class="fw-bold mb-3">คำร้องขอของคุณไม่ผ่านการอนุมัติ</h3>
                            <p class="text-danger mb-4">เหตุผล: ${p.reject_reason || 'ไม่ระบุ'}</p>
                            <p class="text-muted mb-4">กรุณาไปที่หน้า "แก้ไขข้อมูลส่วนตัว" เพื่อทำการอัปเดตข้อมูลให้ถูกต้อง</p>
                            <a href="/lawyer_edit" class="btn btn-primary px-4 rounded-pill">ไปหน้าแก้ไขข้อมูล</a>
                        </div>
                    </div>
                `;
            }
            document.querySelectorAll('.sidebar-nav-list a').forEach(a => {
                if(!a.href.includes('/lawyer_edit')) {
                    a.style.pointerEvents = 'none';
                    a.style.opacity = '0.5';
                }
            });
            window.showBSAlert('ต้องแก้ไขข้อมูล', 'กรุณาแก้ไขข้อมูลตามที่แอดมินแจ้ง', 'error');
            return;
        }

        if (p.status === 'approved' && localStorage.getItem('lawyerApprovedNotified_' + lawyerId) !== 'true') {
            window.showBSAlert('ยินดีด้วย!', 'บัญชีของคุณได้รับการอนุมัติแล้ว', 'success');
            localStorage.setItem('lawyerApprovedNotified_' + lawyerId, 'true');
        }

        document.getElementById('dashName').textContent = (p.full_name || '-');
        document.getElementById('dashLicense').textContent = `เลขที่ใบอนุญาต: ${p.license_number || '-'}`;
        document.getElementById('dashEmail').textContent = p.email || '-';
        document.getElementById('dashPhone').textContent = p.phone || '-';
        document.getElementById('dashLine').textContent = p.line_id || '-';
        
        if (p.facebook_url) {
            document.getElementById('dashFacebook').innerHTML = `<a href="${p.facebook_url}" target="_blank" class="dash-value-link">${p.facebook_url}</a>`;
        } else {
            document.getElementById('dashFacebook').textContent = '-';
        }

        // dashProvince removed
        document.getElementById('dashAddress').textContent = p.office_address || '-';

        if (p.image_path) {
            const headerPicEl = document.getElementById('headerPic');
            if (headerPicEl) {
                headerPicEl.src = p.image_path;
                headerPicEl.style.display = 'block';
            }
            const dashImg = document.getElementById('dashProfileImg');
            if (dashImg) {
                dashImg.src = p.image_path;
                dashImg.style.display = 'block';
            }
        }

        if (p.license_file) {
            let fileNameText = p.license_file;
            try {
                const fileObj = JSON.parse(p.license_file);
                fileNameText = fileObj.name;
            } catch (e) {
                if (typeof fileNameText === 'string' && fileNameText.includes('/')) {
                    fileNameText = fileNameText.split('/').pop();
                }
            }
            document.getElementById('dashLicenseFile').innerHTML = `<a href="${p.license_file}" target="_blank" class="dash-value-link">${fileNameText}</a>`;
        } else {
            document.getElementById('dashLicenseFile').innerHTML = '<span class="text-muted">-</span>';
        }

        const tagsContainer = document.getElementById('dashCategories');
        tagsContainer.innerHTML = '';
        if (data.specialties && data.specialties.length > 0) {
            data.specialties.forEach(spec => {
                const span = document.createElement('span');
                span.className = 'badge rounded-pill category-badge';
                span.textContent = spec.name;
                tagsContainer.appendChild(span);
            });
        } else {
            tagsContainer.innerHTML = '<span class="text-muted">ยังไม่ได้ระบุหมวดหมู่คดี</span>';
        }

        // 1. Fee Rate
        if (p.fee_rate) {
            document.getElementById('dashFeeRate').innerHTML = `<p class="dash-value-text mb-0 ms-3">${p.fee_rate} บาท</p>`;
        }

        // 2. Educations
        const eduContainer = document.getElementById('dashEducations');
        if (data.educations && data.educations.length > 0) {
            let eduHtml = '<ul class="list-unstyled mb-0 ms-3">';
            data.educations.forEach(edu => {
                const start = edu.year_start || '-';
                const end = edu.year_end || 'ปัจจุบัน';
                eduHtml += `<li class="d-flex mb-2 align-items-start"><i class="fa-solid fa-circle me-2 mt-2" style="font-size: 0.4rem; color: #4987A4;"></i>
                    <div>
                        <span class="dash-topic-title">${edu.degree}</span> - <span class="dash-topic-value">${edu.university}</span> 
                        <span class="text-muted small">(${start} - ${end})</span>
                    </div>
                </li>`;
            });
            eduHtml += '</ul>';
            eduContainer.innerHTML = eduHtml;
        }

        // 3. Works
        const workContainer = document.getElementById('dashWorks');
        if (data.works && data.works.length > 0) {
            let workHtml = '<ul class="list-unstyled mb-0 ms-3">';
            data.works.forEach(w => {
                const start = w.year_start || '-';
                const end = w.year_end || 'ปัจจุบัน';
                workHtml += `<li class="d-flex mb-2 align-items-start"><i class="fa-solid fa-circle me-2 mt-2" style="font-size: 0.4rem; color: #4987A4;"></i>
                <div>
                    <span class="dash-topic-title fw-semibold">${w.job_position}</span> - <span class="dash-topic-value">${w.company_name}</span> 
                    <span class="text-muted small">(${start} - ${end})</span>
                </div></li>`;
            });
            workHtml += '</ul>';
            workContainer.innerHTML = workHtml;
        }

        // 3.5 Portfolios
        const portContainer = document.getElementById('dashPortfolios');
        if (data.achievements && data.achievements.length > 0) {
            let portHtml = '<ul class="list-unstyled mb-0 ms-3">';
            data.achievements.forEach(a => {
                const year = a.year || '-';
                portHtml += `<li class="d-flex mb-2 align-items-start"><i class="fa-solid fa-circle me-2 mt-2" style="font-size: 0.4rem; color: #4987A4;"></i>
                <div>
                    <span class="dash-topic-title fw-semibold">${a.title}</span> - <span class="dash-topic-value">${a.organization}</span> <span class="text-muted small">(${year})</span>
                </div>
                </li>`;
            });
            portHtml += '</ul>';
            portContainer.innerHTML = portHtml;
        }

        // 4. Schedules
        const scheduleContainer = document.getElementById('dashSchedules');
        if (data.schedules && data.schedules.length > 0) {
            scheduleContainer.innerHTML = '<div class="table-responsive ms-2"><table class="table table-sm table-borderless mb-0"><tbody>';
            const dayMap = {
                monday: 'จันทร์', tuesday: 'อังคาร', wednesday: 'พุธ', 
                thursday: 'พฤหัสบดี', friday: 'ศุกร์', saturday: 'เสาร์', sunday: 'อาทิตย์'
            }; 
            data.schedules.forEach(s => {
                const dayKey = (s.day_of_week || '').toLowerCase();
                const thaiDay = dayMap[dayKey] || s.day_of_week;
                const status = s.is_open ? `<span style="color: #1A435A; font-weight: 500;">${s.time_start.substring(0,5)} - ${s.time_end.substring(0,5)}</span>` : '<span class="text-danger" style="font-weight: 500;">ปิดทำการ</span>';
                scheduleContainer.querySelector('tbody').innerHTML += `
                    <tr>
                        <td style="color: #1A435A; font-weight: 600;">วัน${thaiDay}</td>
                        <td class="text-end">${status}</td>
                    </tr>
                `;
            });
            scheduleContainer.innerHTML += '</tbody></table></div>';
        }

    } catch (err) {
        console.error(err);
        await window.showBSAlert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลทนายความได้', 'error');
    }
};
