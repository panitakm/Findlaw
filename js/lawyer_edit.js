let lawyerId = null;
let licenseFileData = null;
let existingLicenseFile = null;
let profilePicBase64 = null;
let existingProfilePic = null;
let initialPayloadString = null;

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            e.target.classList.remove('is-invalid');
            if (e.target.id === 'confirmNewpassword') {
                // Remove feedback
            }
        }
    });
});

window.onload = async () => {
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

    setupPasswordStrength();

    document.getElementById('inputZipcode').addEventListener('input', async function() {
        if (this.value.length === 5) {
            await autoFillLocationFromZipcode(this.value);
        }
    });

    await loadProvinces();
    await loadCategories();
    
    // Fetch Lawyer Data
    const res = await fetch(`/lawyers/${lawyerId}/edit`);
    const data = await res.json();
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
    
    if (p.status === 'rejected' && sessionStorage.getItem('lawyerRejectedNotified') !== 'true') {
        window.showBSAlert('โปรดแก้ไขข้อมูล', `เหตุผล: ${p.reject_reason || 'ไม่ระบุ'}`, 'error');
        sessionStorage.setItem('lawyerRejectedNotified', 'true');
    }

    document.getElementById('inputName').value = p.first_name || '';
    document.getElementById('inputLastname').value = p.last_name || '';
    document.getElementById('inputEmail').value = p.email || '';
    document.getElementById('inputPhone').value = p.phone || '';
    document.getElementById('inputLicNum').value = p.license_number || '';
    
    existingLicenseFile = p.license_file || null;
    if (p.license_file) {
        let fileNameText = 'ไฟล์ใบอนุญาต (ไม่สามารถแก้ไขได้)';
        try {
            const fileObj = JSON.parse(p.license_file);
            fileNameText = fileObj.name + ' (ไม่สามารถแก้ไขได้)';
        } catch (e) {
            let extractedName = p.license_file;
            if (typeof extractedName === 'string' && extractedName.includes('/')) {
                extractedName = extractedName.split('/').pop();
            }
            fileNameText = extractedName;
        }
        document.getElementById('licenseFileSection').innerHTML = `
            <label class="form-label">ใบอนุญาตทนายความ</label>
            <div class="form-control form-control-custom readonly-field d-flex align-items-center text-muted" style="background-color: #e9ecef !important; pointer-events: none;">
                <i class="fa-regular fa-file-pdf text-danger me-2"></i>
                <span class="text-truncate">${fileNameText}</span>
            </div>
        `;
    } else {
        document.getElementById('licenseFileSection').innerHTML = `
            <label class="form-label">ใบอนุญาตทนายความ</label>
            <div class="form-control form-control-custom readonly-field d-flex align-items-center text-muted" style="background-color: #e9ecef !important; pointer-events: none;">
                <i class="fa-solid fa-file-circle-xmark me-2"></i>
                <span>ยังไม่มีไฟล์ใบอนุญาต</span>
            </div>
        `;
    }

    document.getElementById('line').value = p.line_id || '';
    document.getElementById('facebook').value = p.facebook_url || '';
    if (p.fee_rate) document.getElementById('inputFeeRate').value = p.fee_rate;
    existingProfilePic = p.image_path || null;

    if (p.image_path) {
        const showPicEl = document.getElementById('showPic');
        if(showPicEl) {
            showPicEl.src = p.image_path;
            showPicEl.style.display = 'block';
        }
    }
    
    const bannerUsernameEl = document.getElementById('bannerUsername');
    if (bannerUsernameEl) {
        bannerUsernameEl.innerText = (p.first_name || '') + ' ' + (p.last_name || '');
    }


    if (p.house_no) document.getElementById('inputHouseNo').value = p.house_no;
    if (p.moo) document.getElementById('inputMoo').value = p.moo;
    if (p.soi) document.getElementById('inputSoi').value = p.soi;
    if (p.road) document.getElementById('inputRoad').value = p.road;
    if (p.zipcode) document.getElementById('inputZipcode').value = p.zipcode;
    
    if (p.province_id) {
        document.getElementById('inputProvince').value = p.province_id;
        await loadDistricts(p.province_id);
        
        if (p.district_id) {
            document.getElementById('inputDistrict').value = p.district_id;
            document.getElementById('inputDistrict').disabled = false;
            await loadSubDistricts(p.district_id);
            
            if (p.subdistrict_id) {
                document.getElementById('inputSubDistrict').value = p.subdistrict_id;
                document.getElementById('inputSubDistrict').disabled = false;
            }
        }
    }

    window.lawyerSpecialties = data.specialties || [];
    renderSpecialties();

    renderSchedules(data.schedules || []);
    renderEducations(data.educations || []);
    renderWorks(data.works || []);
    
    // Fetch Portfolios via dedicated API
    await fetchAndRenderPortfolios();
    // Save initial state to detect unmodified form
    initialPayloadString = JSON.stringify(getFormPayload());
};

function getFormPayload() {
    const oldPass = document.getElementById('oldPassword') ? document.getElementById('oldPassword').value : '';
    const newPass = document.getElementById('newPassword') ? document.getElementById('newPassword').value : '';

    // Collect Schedules
    const schedules = [];
    document.querySelectorAll('.schedule-row').forEach(row => {
        const day = row.dataset.day;
        const isOpen = row.querySelector('.status-select').value === 'open';
        const start = row.querySelector('.time-start').value;
        const end = row.querySelector('.time-end').value;
        schedules.push({
            day_of_week: day,
            is_open: isOpen ? 1 : 0,
            time_start: isOpen ? start : null,
            time_end: isOpen ? end : null
        });
    });

    // Collect Educations
    const educations = [];
    document.querySelectorAll('.edu-row').forEach(row => {
        educations.push({
            degree: row.querySelector('.edu-degree').value,
            university: row.querySelector('.edu-uni').value,
            year_start: row.querySelector('.edu-start').value || null,
            year_end: row.querySelector('.edu-end').value || null
        });
    });

    // Collect Works
    const works = [];
    document.querySelectorAll('.work-row').forEach(row => {
        works.push({
            job_position: row.querySelector('.work-pos').value,
            company_name: row.querySelector('.work-comp').value,
            year_start: row.querySelector('.work-start').value || null,
            year_end: row.querySelector('.work-end').value || null
        });
    });


    // Address Concatenation
    const office_address = [
        document.getElementById('inputHouseNo').value ? document.getElementById('inputHouseNo').value : null,
        document.getElementById('inputMoo').value ? 'หมู่ ' + document.getElementById('inputMoo').value : null,
        document.getElementById('inputSoi').value ? 'ซอย ' + document.getElementById('inputSoi').value : null,
        document.getElementById('inputRoad').value ? 'ถนน ' + document.getElementById('inputRoad').value : null,
        document.getElementById('inputSubDistrict').value && document.getElementById('inputSubDistrict').options[document.getElementById('inputSubDistrict').selectedIndex] ? document.getElementById('inputSubDistrict').options[document.getElementById('inputSubDistrict').selectedIndex].text : null,
        document.getElementById('inputDistrict').value && document.getElementById('inputDistrict').options[document.getElementById('inputDistrict').selectedIndex] ? document.getElementById('inputDistrict').options[document.getElementById('inputDistrict').selectedIndex].text : null,
        document.getElementById('inputProvince').value && document.getElementById('inputProvince').options[document.getElementById('inputProvince').selectedIndex] ? document.getElementById('inputProvince').options[document.getElementById('inputProvince').selectedIndex].text : null,
        document.getElementById('inputZipcode').value ? document.getElementById('inputZipcode').value : null
    ].filter(Boolean).join(' ');

    return {
        old_password: oldPass,
        new_password: newPass,
        image_path: profilePicBase64 || existingProfilePic,
        first_name: document.getElementById('inputName').value,
        last_name: document.getElementById('inputLastname').value,
        email: document.getElementById('inputEmail').value,
        phone: document.getElementById('inputPhone').value,
        line_id: document.getElementById('line').value,
        facebook_url: document.getElementById('facebook').value,
        license_number: document.getElementById('inputLicNum').value,
        province_id: document.getElementById('inputProvince').value,
        fee_rate: document.getElementById('inputFeeRate').value,
        office_address: office_address,
        house_no: document.getElementById('inputHouseNo').value,
        moo: document.getElementById('inputMoo').value,
        soi: document.getElementById('inputSoi').value,
        road: document.getElementById('inputRoad').value,
        subdistrict_id: document.getElementById('inputSubDistrict').value,
        district_id: document.getElementById('inputDistrict').value,
        zipcode: document.getElementById('inputZipcode').value,
        schedules: schedules,
        specialties: window.lawyerSpecialties,
        educations: educations, 
        works: works,
        license_file: licenseFileData || existingLicenseFile        
    };
}

function previewImage() {
    const file = document.getElementById('uploadNewpic').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const showPicEl = document.getElementById('showPic');
            if (showPicEl) {
                showPicEl.src = e.target.result;
                showPicEl.style.display = 'block';
            }
            profilePicBase64 = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

window.togglePassword = function(inputId, iconSpan) {
    const input = document.getElementById(inputId);
    const icon = iconSpan.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

function setupPasswordStrength() {
    const password = document.getElementById('newPassword');
    const passwordStrengthBar = document.getElementById('passwordStrengthBar');
    const passwordFeedback = document.getElementById('passwordFeedback');
    
    if (password && passwordStrengthBar) {
        password.addEventListener('input', () => {
            const val = password.value;
            let score = 0;
            
            if (val.length > 0) {
                score = 1;
                const hasUpper = /[A-Z]/.test(val);
                const hasLower = /[a-z]/.test(val);
                const hasNumber = /[0-9]/.test(val);
                const hasSpecial = /[^a-zA-Z0-9]/.test(val); 
                
                if (val.length >= 8 && hasUpper && hasLower && hasNumber && hasSpecial) {
                    score = 2;
                    if (val.length >= 12) score = 3;
                }
            }

            const colors = ['bg-danger', 'bg-warning', 'bg-success']; 
            const widths = ['0%', '33%', '66%', '100%'];
            passwordStrengthBar.style.width = widths[score];
            passwordStrengthBar.className = `progress-bar ${score > 0 ? colors[score - 1] : ''}`;
        });
    }
}

// Data Loaders
// Data Loaders and Categories logic is now in lawyerSharedFunctions.js


// Schedules
function renderSchedules(existingSchedules) {
    const days = [
        { val: 'Monday', label: 'จันทร์' }, { val: 'Tuesday', label: 'อังคาร' },
        { val: 'Wednesday', label: 'พุธ' }, { val: 'Thursday', label: 'พฤหัสบดี' },
        { val: 'Friday', label: 'ศุกร์' }, { val: 'Saturday', label: 'เสาร์' }, { val: 'Sunday', label: 'อาทิตย์' }
    ];
    
    const container = document.getElementById('scheduleContainer');
    
    let html = `
        <div class="row mb-3 fw-bold text-center d-none d-md-flex" style="color: #1A435A;">
          <div class="col-md-3 text-start" style="padding-left: 20px;">วัน</div>
          <div class="col-md-3">สถานะ</div>
          <div class="col-md-6 text-center">ช่วงเวลาทำการ</div>
        </div>
    `;
    
    html += days.map(d => {
        const sched = existingSchedules.find(s => s.day_of_week.toLowerCase() === d.val.toLowerCase());
        const isOpen = sched ? (sched.is_open ? 'open' : 'closed') : 'open';
        const start = sched && sched.time_start ? sched.time_start.substring(0,5) : '09:00';
        const end = sched && sched.time_end ? sched.time_end.substring(0,5) : '17:00';
        const disabled = isOpen === 'closed' ? 'disabled' : '';

        return `
        <div class="row align-items-center mb-3 schedule-row" data-day="${d.val}">
          <div class="col-md-3 mb-2" style="color: #1A435A; padding-left: 20px; font-size: 0.95rem; font-weight: 500;">วัน${d.label}</div>
          <div class="col-md-3 mb-2">
            <select class="form-select form-control-custom status-select" onchange="toggleScheduleTime(this, '${d.val}')">
              <option value="open" ${isOpen === 'open' ? 'selected' : ''}>เปิดทำการ</option>
              <option value="closed" ${isOpen === 'closed' ? 'selected' : ''}>ปิดทำการ</option>
            </select>
          </div>
          <div class="col-md-6 d-flex align-items-center gap-2 schedule-times" id="times_${d.val}">
            <input type="time" class="form-control form-control-custom time-input time-start" value="${start}" ${disabled}>
            <span class="text-muted fw-bold">-</span>
            <input type="time" class="form-control form-control-custom time-input time-end" value="${end}" ${disabled}>
          </div>
        </div>
    `}).join('');
    
    container.innerHTML = html;
}

// toggleScheduleTime and generateYearOptions extracted to lawyerSharedFunctions.js

// Education
let eduCount = 0;
function renderEducations(educations) {
    if (educations.length === 0) {
        document.getElementById('noEduText').classList.remove('d-none');
    } else {
        educations.forEach(ed => addEducationRow(ed));
    }
}

// addEducationRow and checkEmptyEdu extracted to lawyerSharedFunctions.js

// Works
let workCount = 0;
function renderWorks(works) {
    if (works.length === 0) {
        document.getElementById('noWorkText').classList.remove('d-none');
    } else {
        works.forEach(w => addWorkRow(w));
    }
}

// addWorkRow and checkEmptyWork extracted to lawyerSharedFunctions.js

// --- Portfolios (Past Works) ---
async function fetchAndRenderPortfolios() {
    try {
        const res = await fetch(`/lawyer/lawyer/${lawyerId}/portfolios`);
        if(res.ok) {
            const portfolios = await res.json();
            renderPortfolios(portfolios);
        }
    } catch(err) {
        console.error(err);
    }
}

function renderPortfolios(portfolios) {
    window.lawyerPortfoliosData = portfolios; // Store globally for easy lookup
    const container = document.getElementById('portfolioContainer');
    if(!container) return;
    
    if (portfolios.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-4 mb-2 bg-white border rounded" id="noPortfolioText">ยังไม่มีประวัติผลงาน / คดีความ</div>`;
    } else {
        container.innerHTML = portfolios.map(p => {
            return `
            <div class="p-3 border rounded-3 position-relative" style="background: #fcfdffff;">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="mb-2"><span class="badge px-2 py-2" style="background-color: #4987A4; color: #ffffff; font-weight: 550; border-radius: 50px; box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px;">${p.case_category}</span></div>
                    <div>
                        <button type="button" class="btn-edit bg-transparent border-0 p-0 me-2" onclick="openEditWorkModal(${p.id})" style="font-size: 1.05rem;"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button type="button" class="btn-delete bg-transparent border-0 p-0" onclick="deletePortfolio(${p.id})" style="font-size: 1.05rem;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
                <h6 class="fw-bold text-dark mb-2">${p.title}</h6>
                <p class="text-muted mb-2 text-break" style="font-size: 0.9rem; line-height: 1.5;">${p.details}</p>
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span class="badge" style="background-color: #ddfdeeff; color: #059669; font-weight: 500; border-radius: 50px;">${p.result}</span>
                    <small class="text-muted">${p.summary}</small>
                </div>
            </div>
        `}).join('');
    }
}

function syncCaseCategoryDropdown() {
    const dropdown = document.getElementById('caseCategory');
    if(!dropdown) return;
    dropdown.innerHTML = '<option value="" selected disabled>เลือกหมวดหมู่คดี</option>';
    window.lawyerSpecialties.forEach(sp => {
        // sp could be a string or an object depending on how it's stored. Usually it's an object with a 'name' property.
        const categoryName = sp.name || sp; 
        dropdown.innerHTML += `<option value="${categoryName}">${categoryName}</option>`;
    });
}

let isEditingWork = false;

document.addEventListener('DOMContentLoaded', () => {
    const addWorkModalEl = document.getElementById('addWorkModal');
    if(addWorkModalEl) {
        addWorkModalEl.addEventListener('show.bs.modal', function (event) {
            // If it was not opened by edit button, clear form and sync dropdown
            if (!isEditingWork) {
                syncCaseCategoryDropdown();
                document.getElementById('addWorkForm').reset();
                document.getElementById('workId').value = '';
                document.getElementById('addWorkModalLabel').innerText = 'เพิ่มผลงาน/คดีที่ผ่านมา';
            }
            isEditingWork = false;
        });
    }

    const addWorkForm = document.getElementById('addWorkForm');
    if (addWorkForm) {
        addWorkForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSaveWork');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังบันทึก...';

            const workId = document.getElementById('workId').value;
            const payload = {
                title: document.getElementById('caseTitle').value,
                case_category: document.getElementById('caseCategory').value,
                details: document.getElementById('caseDetails').value,
                result: document.getElementById('caseOutcome').value,
                summary: document.getElementById('caseSummary').value
            };

            try {
                const method = workId ? 'PUT' : 'POST';
                const url = workId ? `/lawyer/lawyer/${lawyerId}/portfolios/${workId}` : `/lawyer/lawyer/${lawyerId}/portfolios`;
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    await window.showBSAlert('สำเร็จ', 'บันทึกผลงานเรียบร้อยแล้ว', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('addWorkModal')).hide();
                    fetchAndRenderPortfolios();
                } else {
                    const err = await res.json();
                    window.showBSAlert('เกิดข้อผิดพลาด', err.error || 'ไม่สามารถบันทึกได้', 'error');
                }
            } catch (err) {
                console.error(err);
                window.showBSAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
            } finally {
                btn.disabled = false;
                btn.innerText = 'บันทึกผลงาน';
            }
        });
    }
});

function openEditWorkModal(id) {
    const p = window.lawyerPortfoliosData ? window.lawyerPortfoliosData.find(x => x.id === id) : null;
    if (!p) return;
    
    isEditingWork = true;
    syncCaseCategoryDropdown();
    
    const categorySelect = document.getElementById('caseCategory');
    const val = p.case_category ? p.case_category.trim() : "";
    let optionExists = false;
    
    for (let i = 0; i < categorySelect.options.length; i++) {
        if (categorySelect.options[i].value === val) {
            optionExists = true;
            break;
        }
    }
    
    if (!optionExists && val) {
        const newOpt = document.createElement('option');
        newOpt.value = val;
        newOpt.textContent = val;
        categorySelect.appendChild(newOpt);
    }
    
    categorySelect.value = val;
    
    document.getElementById('workId').value = p.id;
    document.getElementById('caseTitle').value = p.title;
    document.getElementById('caseDetails').value = p.details;
    document.getElementById('caseOutcome').value = p.result;
    document.getElementById('caseSummary').value = p.summary;
    document.getElementById('addWorkModalLabel').innerText = 'แก้ไขผลงาน / คดีที่ผ่านมา';
    
    const modalEl = document.getElementById('addWorkModal');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
}

async function deletePortfolio(id) {
    const confirm = await window.showBSConfirm('ยืนยันการลบ', 'คุณแน่ใจหรือไม่ว่าต้องการลบผลงานนี้?');
    if (!confirm) return;
    
    try {
        const res = await fetch(`/lawyer/lawyer/${lawyerId}/portfolios/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchAndRenderPortfolios();
        }
    } catch (err) {
        console.error(err);
    }
}


async function saveAllData() {
    const oldPass = document.getElementById('oldPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmNewpassword').value;

    if (newPass || oldPass || confirmPass) {
        if (!oldPass) {
            window.showBSAlert('คำเตือน', 'กรุณาระบุรหัสผ่านปัจจุบันก่อนบันทึกข้อมูล', 'warning').then(() => {
                document.getElementById('oldPassword').focus();
            });
            return;
        }
        if (!newPass) {
            window.showBSAlert('ข้อผิดพลาด', 'กรุณากรอกรหัสผ่านใหม่', 'error');
            return;
        }
        if (newPass !== confirmPass) {
            window.showBSAlert('ข้อผิดพลาด', 'รหัสผ่านใหม่ไม่ตรงกัน', 'error');
            return;
        }
        if (newPass === oldPass) {
            window.showBSAlert('ข้อผิดพลาด', 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน', 'error');
            return;
        }
        
        const hasUpper = /[A-Z]/.test(newPass);
        const hasLower = /[a-z]/.test(newPass);
        const hasNumber = /[0-9]/.test(newPass);
        const hasSpecial = /[^a-zA-Z0-9]/.test(newPass); 
        
        if (newPass.length < 8 || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
             window.showBSAlert('ข้อผิดพลาด', 'รหัสผ่านใหม่ไม่ปลอดภัยพอ กรุณาตรวจสอบเงื่อนไข', 'error');
             return;
        }
    }

    const payload = getFormPayload();
    const currentPayloadString = JSON.stringify(payload);

    if (initialPayloadString && currentPayloadString === initialPayloadString) {
        window.location.href = '/lawyer_dashboard';
        return;
    }

    const res = await fetch(`/lawyer/lawyer/save-profile/${lawyerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await res.json();
    
    if(res.ok) {
        const user = Auth.getUser();
        if (user) {
            if (result.image_path) {
                user.image_path = result.image_path;
            } else if (payload.image_path) {
                user.image_path = payload.image_path;
            }
            user.first_name = document.getElementById('inputName').value;
            user.last_name = document.getElementById('inputLastname').value;
            Auth.setSession(Auth.getToken(), user);
        }
        window.showBSAlert('สำเร็จ', 'บันทึกข้อมูลเรียบร้อยแล้ว', 'success').then(() => {
            window.location.reload();
        });
    } else {
        window.showBSAlert('ข้อผิดพลาด', result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
}
