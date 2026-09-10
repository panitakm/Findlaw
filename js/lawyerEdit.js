let lawyerId = null;

let currentSpecialties = []; 
let allSpecialtiesDB = []; 
let licenseFileData = null;      
let exist
let profilePicBase64 = null;
let existingProfilePic = null;  

window.onload = async () => {
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

    // โหลดจังหวัดเป็นตัวเลือก
    const provRes = await fetch('http://localhost:3000/lawyer/provinces');
    const provinces = await provRes.json();
    const provSelect = document.getElementById('province');
    provSelect.innerHTML = '<option value="">เลือกจังหวัด</option>';
    provinces.forEach(p => {
        provSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
    });

    await loadAllSpecialties();
    // โหลดข้อมูลทนาย
    const res = await fetch(`http://localhost:3000/lawyers/${lawyerId}/edit`);
    const data = await res.json();
    const p = data.profile;

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
            // If it's a URL or path, extract the last segment as filename
            let extractedName = p.license_file;
            if (typeof extractedName === 'string' && extractedName.includes('/')) {
                extractedName = extractedName.split('/').pop();
            }
            fileNameText = extractedName + ' (ไม่สามารถแก้ไขได้)';
        }
        document.getElementById('licenseFileSection').innerHTML = `
            <label class="form-label">ใบอนุญาตทนายความ</label>
            <div class="form-control form-control-custom bg-light d-flex align-items-center text-muted">
                <i class="fa-regular fa-file-pdf text-danger me-2"></i>
                <span>${fileNameText}</span>
            </div>
        `;
    } else {
        document.getElementById('licenseFileSection').innerHTML = `
            <label class="form-label">ใบอนุญาตทนายความ</label>
            <div class="form-control form-control-custom bg-light d-flex align-items-center text-muted">
                <i class="fa-solid fa-file-circle-xmark me-2"></i>
                <span>ยังไม่มีไฟล์ใบอนุญาต</span>
            </div>
        `;
    }

    document.getElementById('line').value = p.line_id || '';
    document.getElementById('facebook').value = p.facebook_url || '';
    document.getElementById('province').value = p.province_id || '';
    document.getElementById('address').value = p.office_address || '';
    if (p.fee_rate) document.getElementById('feeRate').value = p.fee_rate;
    existingProfilePic = p.image_path || null;

    if (p.image_path) {
        const showPicEl = document.getElementById('showPic');
        if(showPicEl) showPicEl.src = p.image_path;
    }
    
    const bannerUsernameEl = document.getElementById('bannerUsername');
    if (bannerUsernameEl) {
        bannerUsernameEl.innerText = (p.first_name || '') + ' ' + (p.last_name || '');
    }

    currentSpecialties = data.specialties || [];
    drawTags(); 

    renderScheduleForm(data.schedules);
    renderEducations(data.educations || []);
    renderWorks(data.works || []);
};

function previewImage() {
    const file = document.getElementById('uploadNewpic').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('showPic').src = e.target.result;
            profilePicBase64 = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

async function saveAllData() {
    const oldPass = document.getElementById('oldPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirmPass = document.getElementById('confirmNewpassword').value;

    if (!oldPass) {
        Swal.fire({
            icon: 'warning',
            title: 'คำเตือน',
            text: 'กรุณาระบุรหัสผ่านปัจจุบันก่อนบันทึกข้อมูล'
        }).then(() => {
            document.getElementById('oldPassword').focus();
        });
        return;
    }

    if (newPass && newPass !== confirmPass) {
        return Swal.fire('ข้อผิดพลาด', 'รหัสผ่านใหม่ไม่ตรงกัน', 'error');
    }

    const payload = {
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
        province_id: document.getElementById('province').value,
        office_address: document.getElementById('address').value,
        schedules: collectSchedules(),
        specialties: currentSpecialties,
        educations: collectEducations(), 
        works: collectWorks(),
        license_file: licenseFileData || existingLicenseFile        
    };

    const res = await fetch(`http://localhost:3000/lawyer/lawyer/save-profile/${lawyerId}`, {
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
        Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: 'บันทึกข้อมูลเรียบร้อยแล้ว'
        }).then(() => {
            window.location.reload();
        });
    } else {
        Swal.fire('ข้อผิดพลาด', result.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
    }
}

const dayMap = { 'monday':'mon','tuesday':'tue','wednesday':'wed','thursday':'thu','friday':'fri','saturday':'sat','sunday':'sun' };

function renderScheduleForm(schedules) {
    schedules.forEach(item => {
        const pre = dayMap[item.day_of_week.toLowerCase()];
        if(pre) {
            document.getElementById(`${pre}_status`).value = item.is_open ? 'เปิดทำการ' : 'ปิดทำการ';
            document.getElementById(`${pre}_open`).value = item.time_start.substring(0,5);
            document.getElementById(`${pre}_close`).value = item.time_end.substring(0,5);
        }
    });
}

function collectSchedules() {
    return Object.keys(dayMap).map(fullDay => {
        const pre = dayMap[fullDay];
        return {
            day_of_week: fullDay,
            is_open: document.getElementById(`${pre}_status`).value === 'เปิดทำการ' ? 1 : 0,
            time_start: document.getElementById(`${pre}_open`).value,
            time_end: document.getElementById(`${pre}_close`).value
        };
    });
}

async function loadAllSpecialties() {
    const res = await fetch('http://localhost:3000/lawyer/categories');
    if (res.ok) {
        const opts = (await res.json()).map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        document.getElementById('selectSpecialty').innerHTML = 
            `<option value="">-- เลือก --</option>${opts}<option value="custom">+ เพิ่มเอง</option>`;
    }
}


// ซ่อน/แสดงช่องพิมพ์
function toggleCustomInput() {
    const isCustom = document.getElementById('selectSpecialty').value === 'custom';
    document.getElementById('newSpecialty').classList.toggle('d-none', !isCustom);
}

// เพิ่มคดี
function addSpecialty() {
    const sel = document.getElementById('selectSpecialty');
    const inp = document.getElementById('inputSpecialty');
    const isCustom = sel.value === 'custom';
    const name = isCustom ? inp.value.trim() : sel.options[sel.selectedIndex]?.text;
    const id = isCustom ? 'new_' + Date.now() : sel.value;

    if (!name || !id) return alert('กรุณาระบุหมวดหมู่');
    if (currentSpecialties.find(s => s.name === name)) return alert('มีหมวดหมู่นี้แล้ว');

    currentSpecialties.push({ id, name });
    drawTags(); 
    
    sel.value = inp.value = '';
    toggleCustomInput();
    bootstrap.Modal.getInstance(document.getElementById('addSpecialty'))?.hide();
}

// วาดกล่อง
function drawTags() {
    document.getElementById('categoryTags').innerHTML = currentSpecialties.length ? 
        currentSpecialties.map((s, i) => 
            `<span class="badge rounded-pill bg-primary bg-opacity-10 text-primary border border-primary px-3 py-2 ms-2 tag-box">
                ${s.name} <i class="fa-solid fa-circle-xmark ms-2" onclick="deleteTag(${i})" style="cursor:pointer"></i>
            </span>`
        ).join('') 
        : '<span class="text-muted mt-2">ยังไม่มีหมวดหมู่คดี</span>';
}

// ลบกล่อง
function deleteTag(i) {
    currentSpecialties.splice(i, 1);
    drawTags();
}

function renderEducations(educations) {
    const container = document.getElementById('education-container');
    container.innerHTML = ''; 
    
    if (educations.length === 0) {
        addEducation(); 
    } else {
        educations.forEach(edu => addEducation(edu.university, edu.degree, edu.year_start, edu.year_end));
    }
}

function addEducation(school = '', degree = '', start = '', end = '') {

    const div = document.createElement('div');
    div.className = 'row g-3 mb-4 border-bottom pb-3'; 
    div.innerHTML = `
        <div class="form-input col-md-6">
            <label class="form-label">มหาวิทยาลัย/สถาบัน</label>
            <input type="text" class="form-control form-control-custom" name="edu_school[]" value="${school}">
        </div>
        <div class="form-input col-md-6">
            <label class="form-label">หลักสูตร/วุฒิการศึกษา</label>
            <input type="text" class="form-control form-control-custom" name="edu_degree[]" value="${degree}">
        </div>
        <div class="form-input col-md-6">
            <label class="form-label">ปีที่เริ่มศึกษา</label>
            <input type="text" class="form-control form-control-custom" name="edu_start[]" value="${start}" maxlength="4">
        </div>
        <div class="form-input col-md-6">
            <label class="form-label">ปีที่จบ</label>
            <input type="text" class="form-control form-control-custom" name="edu_end[]" value="${end}" maxlength="4">
        </div>
        <div class="col-md-12 d-flex justify-content-end mt-3">
            <button type="button" class="btn btn-outline-danger" style="width: 75px;" onclick="removeItem(this)">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;
    document.getElementById('education-container').appendChild(div);
}

function renderWorks(works) {
    const container = document.getElementById('work-container');
    container.innerHTML = ''; 
    
    if (works.length === 0) {
        addWork(); 
    } else {
        works.forEach(work => addWork(work.company_name, work.job_position, work.year_start, work.year_end));
    }
}

function addWork(company = '', position = '', start = '', end = '') {

    const div = document.createElement('div');
    div.className = 'row g-3 mb-4 border-bottom pb-3';
    div.innerHTML = `
        <div class="form-input col-md-6">
            <label class="form-label">ชื่อสถานที่ทำงาน</label>
            <input type="text" class="form-control form-control-custom" name="work_company[]" value="${company}">
        </div>
        <div class="form-input col-md-6">
            <label class="form-label">ตำแหน่งงาน</label>
            <input type="text" class="form-control form-control-custom" name="work_position[]" value="${position}">
        </div>
        <div class="form-input col-md-6">
            <label class="form-label">ปีที่เริ่มทำงาน</label>
            <input type="text" class="form-control form-control-custom" name="work_start[]" value="${start}" maxlength="4">
        </div>
        <div class="form-input col-md-6">
            <label class="form-label">จนถึงปี</label>
            <input type="text" class="form-control form-control-custom" name="work_end[]" value="${end} " maxlength="4">
        </div>
        <div class="col-md-12 d-flex justify-content-end mt-3">
            <button type="button" class="btn btn-outline-danger" style="width: 75px;" onclick="removeItem(this)">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;
    document.getElementById('work-container').appendChild(div);
}

function removeItem(button) {
    button.parentElement.parentElement.remove();
}

//หลังแก้ไข
function collectEducations() {
    const schools = document.getElementsByName('edu_school[]');
    const degrees = document.getElementsByName('edu_degree[]');
    const starts = document.getElementsByName('edu_start[]');
    const ends = document.getElementsByName('edu_end[]');
    let result = [];
    for(let i=0; i<schools.length; i++){
        if(schools[i].value.trim() !== '') { 
            result.push({
                university: schools[i].value,
                degree: degrees[i].value,
                year_start: starts[i].value,
                year_end: ends[i].value
            });
        }
    }
    return result;
}

function collectWorks() {
    const companies = document.getElementsByName('work_company[]');
    const positions = document.getElementsByName('work_position[]');
    const starts = document.getElementsByName('work_start[]');
    const ends = document.getElementsByName('work_end[]');
    let result = [];
    for(let i=0; i<companies.length; i++){
        if(companies[i].value.trim() !== '') { 
            result.push({
                company_name: companies[i].value,
                job_position: positions[i].value,
                year_start: starts[i].value,
                year_end: ends[i].value
            });
        }
    }
    return result;
}

function showFileName() {
    const input = document.getElementById('uploadLicense');
    const display = document.getElementById('fileNameDisplay');
    const text = document.getElementById('fileNameText');

    if (input.files && input.files.length > 0) {
        const file = input.files[0];
        text.innerText = "ไฟล์: " + file.name;
        display.style.display = 'block'; 

        const reader = new FileReader();
        reader.onload = function(e) {
            licenseFileData = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

window.handleNewLicenseFile = function(input) {
    if (input.files && input.files.length > 0) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            licenseFileData = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// เปิด-ปิดช่องกรอกเวลา
function toggleTimeInput(prefix) {
    const status = document.getElementById(`${prefix}_status`).value;
    const openInput = document.getElementById(`${prefix}_open`);
    const closeInput = document.getElementById(`${prefix}_close`);

    if (status === 'ปิดทำการ') {
        openInput.disabled = true;
        closeInput.disabled = true;
        openInput.value = "00:00";
        closeInput.value = "00:00";
    } else {
        openInput.disabled = false;
        closeInput.disabled = false;
    }
}

// ดักจับการกดปุ่ม Submit ของ Form
const editForm = document.querySelector('.needs-validation'); 

if (editForm) {
    editForm.addEventListener('submit', function(event) {
        event.preventDefault(); // สั่งเบรก! ไม่ให้หน้าเว็บ Refresh แบบ Default
        event.stopPropagation();

        if (editForm.checkValidity()) {
            // ถ้ากรอกข้อมูลผ่านเงื่อนไข HTML ครบหมดแล้ว ให้เรียกฟังก์ชันเซฟ
            saveAllData(); 
        } else {
            // ถ้ากรอกข้อมูลบังคับไม่ครบ ให้แสดงเตือนสีแดง (Bootstrap classes)
            editForm.classList.add('was-validated');
        }
    });
}