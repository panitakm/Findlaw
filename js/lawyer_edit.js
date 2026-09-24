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
            <div class="form-control form-control-custom readonly-field bg-light d-flex align-items-center text-muted">
                <i class="fa-regular fa-file-pdf text-danger me-2"></i>
                <span>${fileNameText}</span>
            </div>
        `;
    } else {
        document.getElementById('licenseFileSection').innerHTML = `
            <label class="form-label">ใบอนุญาตทนายความ</label>
            <div class="form-control form-control-custom readonly-field bg-light d-flex align-items-center text-muted">
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
    renderAchievements(data.achievements || []);

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

    // Collect Achievements
    const achievements = [];
    document.querySelectorAll('.achievement-row').forEach(row => {
        achievements.push({
            title: row.querySelector('.ach-title').value,
            organization: row.querySelector('.ach-org').value,
            year: row.querySelector('.ach-year').value || null
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
        achievements: achievements,
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

// Achievements
let achievementCount = 0;
function renderAchievements(achievements) {
    if (achievements.length === 0) {
        document.getElementById('noAchievementText').classList.remove('d-none');
    } else {
        achievements.forEach(a => addAchievementRow(a));
    }
}

function addAchievementRow(data = null) {
    achievementCount++;
    document.getElementById('noAchievementText').classList.add('d-none');
    
    const row = document.createElement('div');
    row.className = 'achievement-row mt-3 mb-3';
    row.innerHTML = `
        <div class="row g-2">
            <div class="col-md-6">
                <input type="text" class="form-control form-control-custom ach-title" placeholder="หัวข้อ/ชื่อผลงาน" value="${data ? data.title : ''}" required>
            </div>
            <div class="col-md-6">
                <input type="text" class="form-control form-control-custom ach-org" placeholder="หน่วยงาน/สถาบัน" value="${data ? data.organization : ''}" required>
            </div>
            <div class="col-md-12">
                <select class="form-select form-control-custom ach-year" required>
                    ${generateYearOptions(data ? data.year : '', 'ปี (พ.ศ.)')}
                </select>
            </div>
            <div class="col-12 text-end mt-2 px-3">
                <button type="button" class="btn-delete bg-transparent border-0 p-0" onclick="this.closest('.achievement-row').remove(); checkEmptyAchievement();">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    document.getElementById('achievementContainer').appendChild(row);
}

function checkEmptyAchievement() {
    if (document.querySelectorAll('.achievement-row').length === 0) {
        document.getElementById('noAchievementText').classList.remove('d-none');
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
