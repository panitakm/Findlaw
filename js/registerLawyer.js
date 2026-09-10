let currentStep = 1;
const totalSteps = 3;
let profilePicBase64 = null;
let licenseFileBase64 = null;

let specialties = [];
let allSpecialtiesDB = [];

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            e.target.classList.remove('is-invalid');
            if (e.target.id === 'inputConfirmPassword') {
                const fb = document.getElementById('confirmPassFeedback');
                if (fb) fb.style.display = 'none';
            }
            if (e.target.id === 'inputPassword') {
                const fb = document.getElementById('passwordFeedback');
                if (fb) fb.style.display = 'none';
            }
            if (e.target.id === 'inputPic') {
                const fb = document.getElementById('picFeedback');
                if (fb) fb.style.display = 'none';
            }
        }
    });
});

window.onload = async () => {
    loadProvinces();
    loadCategories();
    renderSchedules();

    document.getElementById('btnNext').addEventListener('click', nextStep);
    document.getElementById('btnPrev').addEventListener('click', prevStep);
    document.getElementById('wizardForm').addEventListener('submit', submitForm);
    
    document.getElementById('inputZipcode').addEventListener('input', async function() {
        if (this.value.length === 5) {
            await autoFillLocationFromZipcode(this.value);
        }
    });
    
    const stepBtns = document.querySelectorAll('.step-btn');
    stepBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const step = parseInt(e.target.dataset.step);
            if (step < currentStep) {
                goToStep(step);
            }
        });
    });

    document.getElementById('LicFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                licenseFileBase64 = ev.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    const setupPasswordToggle = (inputId, iconId) => {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (input && icon) {
            input.addEventListener('input', () => {
                if (input.value.length > 0) {
                    icon.classList.remove('d-none');
                } else {
                    icon.classList.add('d-none');
                }
            });
            icon.addEventListener('click', () => {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        }
    };
    setupPasswordToggle('inputPassword', 'togglePassword');
    setupPasswordToggle('inputConfirmPassword', 'toggleConfirmPassword');

    // Password Strength & Validation
    const password = document.getElementById('inputPassword');
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

            if (val === '') {
                password.setCustomValidity('Empty');
                if(passwordFeedback) passwordFeedback.textContent = 'กรุณากรอกรหัสผ่าน';
            } else if (score < 2) {
                password.setCustomValidity('Weak');
                if(passwordFeedback) passwordFeedback.textContent = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ';
            } else {
                password.setCustomValidity('');
            }
        });
    }
};

function previewImage(inputId, previewId) {
    const file = document.getElementById(inputId).files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById(previewId);
            preview.src = e.target.result;
            preview.style.display = 'block';
            if (inputId === 'inputPic') {
                profilePicBase64 = e.target.result;
                const icon = document.getElementById('profileIcon');
                if(icon) icon.style.display = 'none';
            }
        }
        reader.readAsDataURL(file);
    }
}

function updateStepper() {
    const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
    document.getElementById('wizardProgress').style.width = `${progress}%`;
    
    document.querySelectorAll('.step-btn').forEach((btn, idx) => {
        if (idx + 1 < currentStep) {
            btn.className = 'btn btn-success rounded-circle step-btn text-white';
            btn.innerHTML = '<i class="fa-solid fa-check text-center" style="font-size: 1.5rem;"</i>';
        } else if (idx + 1 === currentStep) {
            btn.className = 'btn btn-primary rounded-circle step-btn';
            btn.innerHTML = currentStep;
        } else {
            btn.className = 'btn btn-light border rounded-circle step-btn';
            btn.innerHTML = idx + 1;
        }
    });
}

function goToStep(step) {
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.add('d-none');
        el.classList.remove('active');
    });
    document.getElementById(`step${step}`).classList.remove('d-none');
    document.getElementById(`step${step}`).classList.add('active');
    
    currentStep = step;
    updateStepper();
    
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnSubmit = document.getElementById('btnSubmit');
    
    if (currentStep === 1) {
        btnPrev.classList.add('d-none');
    } else {
        btnPrev.classList.remove('d-none');
    }
    
    if (currentStep === totalSteps) {
        btnNext.classList.add('d-none');
        btnSubmit.classList.remove('d-none');
    } else {
        btnNext.classList.remove('d-none');
        btnSubmit.classList.add('d-none');
    }
}

function nextStep() {
    // ปิดการตรวจสอบชั่วคราวสำหรับการพัฒนา (อย่าลืมเปิดใช้งานเมื่อเสร็จสิ้น)
    if (!validateStep(currentStep)) return;
    if (currentStep < totalSteps) {
        goToStep(currentStep + 1);
    }
}

function prevStep() {
    if (currentStep > 1) {
        goToStep(currentStep - 1);
    }
}

function validateStep(step) {
    let isValid = true;
    let firstInvalid = null;
    const currentTab = document.getElementById(`step${step}`);
    const inputs = currentTab.querySelectorAll('input[required], select[required], textarea[required]');
    
    inputs.forEach(input => {
        if (!input.checkValidity()) {
            input.classList.add('is-invalid');
            isValid = false;
            if (!firstInvalid) firstInvalid = input;
        } else {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        }
    });

    if (step === 1) {
        if (!profilePicBase64) {
            document.getElementById('picFeedback').style.display = 'block';
            isValid = false;
            if (!firstInvalid) firstInvalid = document.getElementById('inputPic').parentElement;
        } else {
            document.getElementById('picFeedback').style.display = 'none';
        }
        
        const pwd = document.getElementById('inputPassword');
        const confirmPwd = document.getElementById('inputConfirmPassword');
        if (pwd.value !== confirmPwd.value) {
            confirmPwd.classList.add('is-invalid');
            document.getElementById('confirmPassFeedback').style.display = 'block';
            isValid = false;
            if (!firstInvalid) firstInvalid = confirmPwd;
        }
    }
    
    if (step === 2) {
        if (specialties.length === 0) {
            document.getElementById('categoryFeedback').style.display = 'block';
            isValid = false;
            if (!firstInvalid) firstInvalid = document.getElementById('categoryContainer');
        } else {
            document.getElementById('categoryFeedback').style.display = 'none';
        }
    }

    if (!isValid && firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return isValid;
}

// Data Loaders
async function loadProvinces() {
    try {
        const res = await fetch('http://localhost:3000/lawyer/provinces');
        const provinces = await res.json();
        const select = document.getElementById('inputProvince');
        provinces.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            select.appendChild(opt);
        });

        // Add Event Listener for Province change
        select.addEventListener('change', function() {
            const provinceId = this.value;
            const districtSelect = document.getElementById('inputDistrict');
            const subDistrictSelect = document.getElementById('inputSubDistrict');
            const zipcodeInput = document.getElementById('inputZipcode');
            
            // Reset fields
            districtSelect.innerHTML = '<option value="">-- เลือกอำเภอ/เขต --</option>';
            subDistrictSelect.innerHTML = '<option value="">-- เลือกตำบล/แขวง --</option>';
            zipcodeInput.value = '';
            
            if (provinceId) {
                districtSelect.disabled = false;
                loadDistricts(provinceId);
            } else {
                districtSelect.disabled = true;
                subDistrictSelect.disabled = true;
            }
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadDistricts(provinceId) {
    try {
        const res = await fetch(`http://localhost:3000/lawyer/districts?province_id=${provinceId}`);
        const districts = await res.json();
        const select = document.getElementById('inputDistrict');
        districts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.name;
            select.appendChild(opt);
        });

        // Event listener is attached once here to prevent duplicates
        if (!select.dataset.listenerAttached) {
            select.addEventListener('change', function() {
                const districtId = this.value;
                const subDistrictSelect = document.getElementById('inputSubDistrict');
                const zipcodeInput = document.getElementById('inputZipcode');
                
                // Reset fields
                subDistrictSelect.innerHTML = '<option value="">-- เลือกตำบล/แขวง --</option>';
                zipcodeInput.value = '';
                
                if (districtId) {
                    subDistrictSelect.disabled = false;
                    loadSubDistricts(districtId);
                } else {
                    subDistrictSelect.disabled = true;
                }
            });
            select.dataset.listenerAttached = 'true';
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadSubDistricts(districtId) {
    try {
        const res = await fetch(`http://localhost:3000/lawyer/subdistricts?district_id=${districtId}`);
        const subdistricts = await res.json();
        const select = document.getElementById('inputSubDistrict');
        
        // Store zipcode data in options
        subdistricts.forEach(sd => {
            const opt = document.createElement('option');
            opt.value = sd.id;
            opt.textContent = sd.name;
            opt.dataset.zipcode = sd.zip_code;
            select.appendChild(opt);
        });

        // Event listener for auto-filling zipcode
        if (!select.dataset.listenerAttached) {
            select.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                const zipcodeInput = document.getElementById('inputZipcode');
                if (selectedOption && selectedOption.dataset.zipcode) {
                    zipcodeInput.value = selectedOption.dataset.zipcode;
                } else {
                    // zipcodeInput.value = ''; // Don't clear zipcode if user typed it
                }
            });
            select.dataset.listenerAttached = 'true';
        }
    } catch (err) {
        console.error(err);
    }
}

async function autoFillLocationFromZipcode(zipcode) {
    try {
        const res = await fetch(`http://localhost:3000/lawyer/zipcode?zipcode=${zipcode}`);
        const locations = await res.json();
        
        if (locations.length > 0) {
            const loc = locations[0];
            
            const provinceSelect = document.getElementById('inputProvince');
            const districtSelect = document.getElementById('inputDistrict');
            const subDistrictSelect = document.getElementById('inputSubDistrict');
            
            provinceSelect.value = loc.province_id;
            
            districtSelect.innerHTML = '<option value="">-- เลือกอำเภอ/เขต --</option>';
            subDistrictSelect.innerHTML = '<option value="">-- เลือกตำบล/แขวง --</option>';
            districtSelect.disabled = false;
            subDistrictSelect.disabled = false;
            
            await loadDistricts(loc.province_id);
            districtSelect.value = loc.district_id;
            
            await loadSubDistricts(loc.district_id);
            subDistrictSelect.value = loc.subdistrict_id;
        }
    } catch (err) {
        console.error('Error fetching location by zipcode:', err);
    }
}

async function loadCategories() {
    try {
        const res = await fetch('http://localhost:3000/lawyer/categories');
        allSpecialtiesDB = await res.json();
        const select = document.getElementById('selectSpecialty');
        select.innerHTML = '<option value="">-- เลือกหมวดหมู่ --</option>';
        allSpecialtiesDB.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        select.innerHTML += `<option value="other">อื่นๆ (ระบุเอง)</option>`;
    } catch (err) {
        console.error(err);
    }
}

// Specialties
function toggleCustomInput() {
    const select = document.getElementById('selectSpecialty');
    const customDiv = document.getElementById('newSpecialtyContainer');
    if (select.value === 'other') {
        customDiv.classList.remove('d-none');
    } else {
        customDiv.classList.add('d-none');
    }
}

function addSpecialty() {
    const select = document.getElementById('selectSpecialty');
    const input = document.getElementById('inputNewSpecialty');
    
    let specValue = '';
    let specName = '';
    
    if (select.value === 'other') {
        if (!input.value.trim()) {
            alert('กรุณาระบุชื่อหมวดหมู่');
            return;
        }
        specValue = input.value.trim();
        specName = input.value.trim();
    } else if (select.value !== '') {
        specValue = select.value;
        specName = select.options[select.selectedIndex].text;
    } else {
        alert('กรุณาเลือกหมวดหมู่');
        return;
    }

    if (specialties.some(s => s.name === specName)) {
        alert('หมวดหมู่นี้ถูกเพิ่มไปแล้ว');
        return;
    }

    specialties.push({ id: specValue, name: specName });
    renderSpecialties();
    
    const modalEl = document.getElementById('addSpecialtyModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if(modal) modal.hide();
    
    select.value = '';
    input.value = '';
    document.getElementById('newSpecialtyContainer').classList.add('d-none');
}

function removeSpecialty(name) {
    specialties = specialties.filter(s => s.name !== name);
    renderSpecialties();
}

function renderSpecialties() {
    const container = document.getElementById('categoryContainer');
    if (specialties.length === 0) {
        container.innerHTML = '<div class="text-center text-muted w-100 my-auto" id="noSpecialtyText">ยังไม่มีการเพิ่มหมวดหมู่คดี</div>';
    } else {
        container.innerHTML = specialties.map(s => `
            <span class="category-badge tag-box">
                ${s.name}
                <i class="fa-solid fa-xmark ms-2 tag-remove-icon" onclick="removeSpecialty('${s.name}')"></i>
            </span>
        `).join('');
    }
    document.getElementById('selectedCategories').value = specialties.length > 0 ? 'valid' : '';
    document.getElementById('categoryFeedback').style.display = 'none';
}

// Schedules
function renderSchedules() {
    const days = [
        { val: 'Monday', label: 'จันทร์' }, { val: 'Tuesday', label: 'อังคาร' },
        { val: 'Wednesday', label: 'พุธ' }, { val: 'Thursday', label: 'พฤหัสบดี' },
        { val: 'Friday', label: 'ศุกร์' }, { val: 'Saturday', label: 'เสาร์' }, { val: 'Sunday', label: 'อาทิตย์' }
    ];
    
    const container = document.getElementById('scheduleContainer');
    
    let html = `
        <div class="row mb-3 fw-bold text-center d-none d-md-flex" style="color: #0A3D73;">
          <div class="col-md-3 text-start" style="padding-left: 20px;">วัน</div>
          <div class="col-md-3">สถานะ</div>
          <div class="col-md-6 text-center">ช่วงเวลาทำการ</div>
        </div>
    `;
    
    html += days.map(d => `
        <div class="row align-items-center mb-3 schedule-row" data-day="${d.val}">
          <div class="col-md-3 mb-2 text-muted" style="padding-left: 20px; font-size: 0.95rem; font-weight: 500;">วัน${d.label}</div>
          <div class="col-md-3 mb-2">
            <select class="form-select status-select" onchange="toggleScheduleTime(this, '${d.val}')">
              <option value="open">เปิดทำการ</option>
              <option value="closed">ปิดทำการ</option>
            </select>
          </div>
          <div class="col-md-6 d-flex align-items-center gap-2 schedule-times" id="times_${d.val}">
            <input type="time" class="form-control time-input time-start" value="09:00">
            <span class="text-muted fw-bold">-</span>
            <input type="time" class="form-control time-input time-end" value="17:00">
          </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function toggleScheduleTime(selectElement, day) {
    const timesDiv = document.getElementById(`times_${day}`);
    const inputs = timesDiv.querySelectorAll('input[type="time"]');
    if (selectElement.value === 'closed') {
        inputs.forEach(input => input.disabled = true);
    } else {
        inputs.forEach(input => input.disabled = false);
    }
}


let eduCount = 0;
function addEducationRow() {
    eduCount++;
    document.getElementById('noEduText').classList.add('d-none');
    
    const row = document.createElement('div');
    row.className = 'list-group-item edu-row bg-white p-3 mb-2 rounded border';
    row.innerHTML = `
        <div class="row g-2">
            <div class="col-md-6">
                <input type="text" class="form-control form-control-sm edu-degree" placeholder="วุฒิการศึกษา (เช่น นิติศาสตรบัณฑิต)" required>
            </div>
            <div class="col-md-6">
                <input type="text" class="form-control form-control-sm edu-uni" placeholder="สถาบันการศึกษา" required>
            </div>
            <div class="col-md-5">
                <input type="number" class="form-control form-control-sm edu-start" placeholder="ปีเริ่ม (พ.ศ.)" required>
            </div>
            <div class="col-md-5">
                <input type="number" class="form-control form-control-sm edu-end" placeholder="ถึงปี (พ.ศ.)">
            </div>
            <div class="col-md-2 d-flex align-items-center justify-content-end">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.edu-row').remove(); checkEmptyEdu();"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `;
    document.getElementById('educationContainer').appendChild(row);
}
function checkEmptyEdu() {
    if (document.querySelectorAll('.edu-row').length === 0) {
        document.getElementById('noEduText').classList.remove('d-none');
    }
}

let workCount = 0;
function addWorkRow() {
    workCount++;
    document.getElementById('noWorkText').classList.add('d-none');
    
    const row = document.createElement('div');
    row.className = 'list-group-item work-row bg-white p-3 mb-2 rounded border';
    row.innerHTML = `
        <div class="row g-2">
            <div class="col-md-6">
                <input type="text" class="form-control form-control-sm work-pos" placeholder="ตำแหน่ง" required>
            </div>
            <div class="col-md-6">
                <input type="text" class="form-control form-control-sm work-comp" placeholder="บริษัท/สำนักงาน" required>
            </div>
            <div class="col-md-5">
                <input type="number" class="form-control form-control-sm work-start" placeholder="ปีเริ่ม (พ.ศ.)" required>
            </div>
            <div class="col-md-5">
                <input type="number" class="form-control form-control-sm work-end" placeholder="ถึงปี (พ.ศ.">
            </div>
            <div class="col-md-2 d-flex align-items-center justify-content-end">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.work-row').remove(); checkEmptyWork();"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `;
    document.getElementById('workContainer').appendChild(row);
}
function checkEmptyWork() {
    if (document.querySelectorAll('.work-row').length === 0) {
        document.getElementById('noWorkText').classList.remove('d-none');
    }
}

// Submission
async function submitForm(e) {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    // Collect Schedules
    const schedules = [];
    document.querySelectorAll('.schedule-row').forEach(row => {
        const day = row.dataset.day;
        const isOpen = row.querySelector('.status-select').value === 'open';
        const start = row.querySelector('.time-start').value;
        const end = row.querySelector('.time-end').value;
        schedules.push({
            day_of_week: day,
            is_open: isOpen,
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

    const payload = {
        inputFirsname: document.getElementById('inputFirsname').value,
        inputLastname: document.getElementById('inputLastname').value,
        inputEmail: document.getElementById('inputEmail').value,
        inputPhone: document.getElementById('inputPhone').value,
        inputPassword: document.getElementById('inputPassword').value,
        
        inputLicNum: document.getElementById('inputLicNum').value,
        inputProvince: document.getElementById('inputProvince').value,
        inputHouseNo: document.getElementById('inputHouseNo').value,
        inputMoo: document.getElementById('inputMoo').value,
        inputSoi: document.getElementById('inputSoi').value,
        inputRoad: document.getElementById('inputRoad').value,
        inputSubDistrict: document.getElementById('inputSubDistrict').value,
        inputDistrict: document.getElementById('inputDistrict').value,
        inputZipcode: document.getElementById('inputZipcode').value,
        inputLineId: document.getElementById('inputLineId').value,
        inputFacebook: document.getElementById('inputFacebook').value,
        inputFeeRate: document.getElementById('inputFeeRate').value,
        
        profilePic: profilePicBase64,
        LicFile: licenseFileBase64,
        
        categories: specialties.map(s => s.id),
        schedules: schedules,
        educations: educations,
        works: works
    };

    const btnSubmit = document.getElementById('btnSubmit');
    const spinner = document.getElementById('submitSpinner');
    const btnText = document.getElementById('submitText');
    
    btnSubmit.disabled = true;
    spinner.classList.remove('d-none');
    btnText.textContent = 'กำลังบันทึก...';

    try {
        const res = await fetch('http://localhost:3000/lawyer/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const result = await res.json();
        
        if (res.ok) {
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ!',
                text: 'สมัครสมาชิกสำเร็จ กรุณารอการตรวจสอบจากผู้ดูแลระบบ',
                confirmButtonText: 'ตกลง'
            }).then(() => {
                window.location.href = '/login.html';
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'ผิดพลาด',
                text: result.error || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
            });
        }
    } catch (err) {
        console.error(err);
        Swal.fire({
            icon: 'error',
            title: 'ผิดพลาด',
            text: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้'
        });
    } finally {
        btnSubmit.disabled = false;
        spinner.classList.add('d-none');
        btnText.textContent = 'สมัครสมาชิก';
    }
}
