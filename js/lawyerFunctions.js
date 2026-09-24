// Shared variables for lawyer forms
window.lawyerSpecialties = [];
window.allSpecialtiesDB = [];
window.eduCount = 0;
window.workCount = 0;

// ==========================================
// Location Functions
// ==========================================
async function loadProvinces() {
    try {
        const res = await fetch('/lawyer/provinces');
        const provinces = await res.json();
        const select = document.getElementById('inputProvince');
        if(!select) return;
        provinces.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            select.appendChild(opt);
        });

        select.addEventListener('change', function() {
            const provinceId = this.value;
            const districtSelect = document.getElementById('inputDistrict');
            const subDistrictSelect = document.getElementById('inputSubDistrict');
            const zipcodeInput = document.getElementById('inputZipcode');
            
            districtSelect.innerHTML = '<option value="">เลือกอำเภอ/เขต</option>';
            subDistrictSelect.innerHTML = '<option value="">เลือกตำบล/แขวง</option>';
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
        const res = await fetch(`/lawyer/districts?province_id=${provinceId}`);
        const districts = await res.json();
        const select = document.getElementById('inputDistrict');
        districts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.name;
            select.appendChild(opt);
        });

        if (!select.dataset.listenerAttached) {
            select.addEventListener('change', function() {
                const districtId = this.value;
                const subDistrictSelect = document.getElementById('inputSubDistrict');
                const zipcodeInput = document.getElementById('inputZipcode');
                
                subDistrictSelect.innerHTML = '<option value="">เลือกตำบล/แขวง</option>';
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
        const res = await fetch(`/lawyer/subdistricts?district_id=${districtId}`);
        const subdistricts = await res.json();
        const select = document.getElementById('inputSubDistrict');
        
        subdistricts.forEach(sd => {
            const opt = document.createElement('option');
            opt.value = sd.id;
            opt.textContent = sd.name;
            opt.dataset.zipcode = sd.zip_code;
            select.appendChild(opt);
        });

        if (!select.dataset.listenerAttached) {
            select.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                const zipcodeInput = document.getElementById('inputZipcode');
                if (selectedOption && selectedOption.dataset.zipcode) {
                    zipcodeInput.value = selectedOption.dataset.zipcode;
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
        const res = await fetch(`/lawyer/zipcode?zipcode=${zipcode}`);
        const locations = await res.json();
        
        if (locations.length > 0) {
            const loc = locations[0];
            
            const provinceSelect = document.getElementById('inputProvince');
            const districtSelect = document.getElementById('inputDistrict');
            const subDistrictSelect = document.getElementById('inputSubDistrict');
            
            provinceSelect.value = loc.province_id;
            
            districtSelect.innerHTML = '<option value="">เลือกอำเภอ/เขต</option>';
            subDistrictSelect.innerHTML = '<option value="">เลือกตำบล/แขวง</option>';
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

// ==========================================
// Categories / Specialties
// ==========================================
async function loadCategories() {
    try {
        const res = await fetch('/lawyer/categories');
        window.allSpecialtiesDB = await res.json();
        const select = document.getElementById('selectSpecialty');
        if(!select) return;
        select.innerHTML = '<option value="">เลือกหมวดหมู่</option>';
        window.allSpecialtiesDB.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
        select.innerHTML += `<option value="other">อื่นๆ (ระบุเอง)</option>`;
    } catch (err) {
        console.error(err);
    }
}

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
            window.showBSAlert('แจ้งเตือน', 'กรุณาระบุชื่อหมวดหมู่', 'warning');
            return;
        }
        specValue = input.value.trim();
        specName = input.value.trim();
    } else if (select.value !== '') {
        specValue = select.value;
        specName = select.options[select.selectedIndex].text;
    } else {
        window.showBSAlert('แจ้งเตือน', 'กรุณาเลือกหมวดหมู่', 'warning');
        return;
    }

    if (window.lawyerSpecialties.some(s => s.name === specName)) {
        window.showBSAlert('แจ้งเตือน', 'หมวดหมู่นี้ถูกเพิ่มไปแล้ว', 'warning');
        return;
    }

    window.lawyerSpecialties.push({ id: specValue, name: specName });
    renderSpecialties();
    
    // Support both modal IDs
    const modalEl = document.getElementById('addSpecialty') || document.getElementById('addSpecialtyModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if(modal) modal.hide();
    }
    
    select.value = '';
    input.value = '';
    document.getElementById('newSpecialtyContainer').classList.add('d-none');
}

function removeSpecialty(name) {
    window.lawyerSpecialties = window.lawyerSpecialties.filter(s => s.name !== name);
    renderSpecialties();
}

function renderSpecialties() {
    const container = document.getElementById('categoryContainer');
    if(!container) return;
    
    if (window.lawyerSpecialties.length === 0) {
        container.innerHTML = '<div class="text-center text-muted w-100 my-auto" id="noSpecialtyText">ยังไม่มีการเพิ่มหมวดหมู่คดี</div>';
    } else {
        container.innerHTML = window.lawyerSpecialties.map(s => `
            <span class="category-badge d-inline-flex align-items-center px-3 py-2 rounded-pill"> ${s.name}
                <i class="fa-solid fa-xmark ms-2 tag-remove-icon" onclick="removeSpecialty('${s.name}')" style="cursor: pointer;"></i>
            </span>
        `).join('');
    }
    
    const selectedInput = document.getElementById('selectedCategories');
    if (selectedInput) selectedInput.value = window.lawyerSpecialties.length > 0 ? 'valid' : '';
    
    const fb = document.getElementById('categoryFeedback');
    if (fb) fb.style.display = 'none';
}

// ==========================================
// Schedules
// ==========================================
function toggleScheduleTime(selectElement, day) {
    const timesDiv = document.getElementById(`times_${day}`);
    const inputs = timesDiv.querySelectorAll('input[type="time"]');
    if (selectElement.value === 'closed') {
        inputs.forEach(input => input.disabled = true);
    } else {
        inputs.forEach(input => input.disabled = false);
    }
}

function generateYearOptions(selectedValue = '', placeholder = 'ปี (พ.ศ.)') {
    const currentYearBE = new Date().getFullYear() + 543;
    let options = `<option value="" ${!selectedValue ? 'selected' : ''} disabled>${placeholder}</option>`;
    for (let y = currentYearBE; y >= currentYearBE - 80; y--) {
        options += `<option value="${y}" ${selectedValue == y ? 'selected' : ''}>${y}</option>`;
    }
    return options;
}

// ==========================================
// Education
// ==========================================
function addEducationRow(data = null) {
    window.eduCount++;
    const noEdu = document.getElementById('noEduText');
    if(noEdu) noEdu.classList.add('d-none');
    
    const row = document.createElement('div');
    row.className = 'edu-row mb-3';
    row.innerHTML = `
        <div class="row g-2">
            <div class="col-md-6">
                <input type="text" class="form-control form-control-custom edu-degree" placeholder="วุฒิการศึกษา (เช่น นิติศาสตรบัณฑิต)" value="${data ? data.degree : ''}" required>
            </div>
            <div class="col-md-6">
                <input type="text" class="form-control form-control-custom edu-uni" placeholder="สถาบันการศึกษา" value="${data ? data.university : ''}" required>
            </div>
            <div class="col-md-6">
                <select class="form-select form-control-custom edu-start" required>
                    ${generateYearOptions(data ? data.year_start : '', 'ปี (พ.ศ.)')}
                </select>
            </div>
            <div class="col-md-6">
                <select class="form-select form-control-custom edu-end">
                    ${generateYearOptions(data ? data.year_end : '', 'ถึงปี (พ.ศ.)')}
                </select>
            </div>
            <div class="col-12 text-end mt-2 mb-3 px-3">
                <button type="button" class="btn-delete bg-transparent border-0 p-0" onclick="this.closest('.edu-row').remove(); checkEmptyEdu();">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    document.getElementById('educationContainer').appendChild(row);
}

function checkEmptyEdu() {
    if (document.querySelectorAll('.edu-row').length === 0) {
        const noEdu = document.getElementById('noEduText');
        if (noEdu) noEdu.classList.remove('d-none');
    }
}

// ==========================================
// Work Experience
// ==========================================
function addWorkRow(data = null) {
    window.workCount++;
    const noWork = document.getElementById('noWorkText');
    if(noWork) noWork.classList.add('d-none');
    
    const row = document.createElement('div');
    row.className = 'work-row mt-3 mb-3';
    row.innerHTML = `
        <div class="row g-2">
            <div class="col-md-6">
                <input type="text" class="form-control form-control-custom work-pos" placeholder="ตำแหน่ง" value="${data ? data.job_position : ''}" required>
            </div>
            <div class="col-md-6">
                <input type="text" class="form-control form-control-custom work-comp" placeholder="บริษัท/สำนักงาน" value="${data ? data.company_name : ''}" required>
            </div>
            <div class="col-md-6">
                <select class="form-select form-control-custom work-start" required>
                    ${generateYearOptions(data ? data.year_start : '', 'ปี (พ.ศ.)')}
                </select>
            </div>
            <div class="col-md-6">
                <select class="form-select form-control-custom work-end">
                    ${generateYearOptions(data ? data.year_end : '', 'ถึงปี (พ.ศ.)')}
                </select>
            </div>
            <div class="col-12 text-end mt-2 px-3">
                <button type="button" class="btn-delete bg-transparent border-0 p-0" onclick="this.closest('.work-row').remove(); checkEmptyWork();">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    document.getElementById('workContainer').appendChild(row);
}

function checkEmptyWork() {
    if (document.querySelectorAll('.work-row').length === 0) {
        const noWork = document.getElementById('noWorkText');
        if (noWork) noWork.classList.remove('d-none');
    }
}
