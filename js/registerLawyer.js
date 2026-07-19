(() => {
    'use strict';
    
    const forms = document.querySelectorAll('.needs-validation');
    
    forms.forEach(form => {
        const email = form.querySelector('#inputEmail');
        const password = form.querySelector('#inputPassword');
        const passwordFeedback = form.querySelector('#passwordFeedback');
        const confirm = form.querySelector('#confirmPassword');
        const confirmFeedback = form.querySelector('#confirmFeedback');
        const passwordStrengthBar = form.querySelector('#passwordStrengthBar');
    
        form.addEventListener('submit', async event => {
            if (!email.value.includes('@') || !email.value.endsWith('.com')) {
                email.setCustomValidity('Invalid');
            } else {
                email.setCustomValidity('');
            }

            // เช็กช่องรหัสผ่าน
            if (password.value === '') {
                password.setCustomValidity('Empty');
                passwordFeedback.textContent = 'กรุณากรอกรหัสผ่านก่อน';
            } else if (password.validity.patternMismatch) {
                password.setCustomValidity('Pattern');
                passwordFeedback.textContent = 'รหัสผ่านต้องประกอบด้วย A-Z, a-z, 0-9 และอักขระพิเศษ อย่างน้อย 8 ตัว';
            } else {
                password.setCustomValidity('');
            }
    
            // เช็กช่องยืนยันรหัสผ่าน
            if (confirm.value === '') {
                confirm.setCustomValidity('Empty');
                confirmFeedback.textContent = 'กรุณากรอกรหัสผ่านยืนยันก่อน';
            } else if (confirm.value !== password.value) {
                confirm.setCustomValidity('Mismatch');
                confirmFeedback.textContent = 'รหัสผ่านไม่ตรงกัน';
            } else {
                confirm.setCustomValidity('');
            }
    
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
                form.classList.add('was-validated');
            } else {
                // ข้อมูลผ่านทั้งหมด เตรียมยิง API
                event.preventDefault(); 
                
                const submitBtn = document.getElementById('submitBtn');
                const spinner = document.getElementById('submitSpinner');
                const btnText = document.getElementById('submitText');
                
                // เปลี่ยนสถานะปุ่มเป็น Loading
                submitBtn.disabled = true;
                spinner.classList.remove('d-none');
                btnText.textContent = ' กำลังดำเนินการ...';

                // ดึง Base64 ของรูปโปรไฟล์ (ถ้ามี)
                const profileImgSrc = document.getElementById('previewProfile').src;
                const profilePicData = profileImgSrc.includes('data:image') ? profileImgSrc : null;

                // เตรียมข้อมูลเพื่อส่งไป Backend
                const requestData = {
                    inputFirsname: document.getElementById('inputFirsname').value,
                    inputLastname: document.getElementById('inputLastname').value,
                    inputEmail: email.value,
                    inputPhone: document.getElementById('inputPhone').value,
                    inputPassword: password.value,
                    inputLicNum: document.getElementById('inputLicNum').value,
                    inputAddress: document.getElementById('inputAddress').value,
                    inputProvince: document.getElementById('inputProvince').value, // ส่งค่าเป็นตัวเลข ID จังหวัด
                    profilePic: profilePicData,
                    LicFile: licenseFileBase64 
                };

                try {
                    // ยิง API ไปที่หลังบ้าน
                    const response = await fetch('http://localhost:3000/lawyer/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestData)
                    });

                    const data = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(data.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
                    }

                    // สมัครสำเร็จ!
                    alert(data.message); 
                    window.location.href = '/login.html'; 
                    
                } catch (error) {
                    alert('ล้มเหลว: ' + error.message);
                    // ปลดล็อกปุ่มให้แก้ไขข้อมูลได้ใหม่
                    submitBtn.disabled = false;
                    spinner.classList.add('d-none');
                    btnText.textContent = 'สมัครสมาชิก';
                }
            }
        });

        // เช็ก Email ตอนพิมพ์
        email.addEventListener('input', () => {
            if (!email.value.includes('@') || !email.value.endsWith('.com')) {
                email.setCustomValidity('Invalid');
            } else {
                email.setCustomValidity('');
            }
        });
    
        // แถบความปลอดภัยรหัสผ่าน (3 ระดับ แดง, เหลือง, เขียว)
        password.addEventListener('input', () => {
            const val = password.value;
    
            if (val === '') {
                passwordFeedback.textContent = 'กรุณากรอกรหัสผ่านก่อน';
                password.setCustomValidity('Empty');
            } else if (password.validity.patternMismatch) {
                passwordFeedback.textContent = 'รหัสผ่านต้องประกอบด้วย A-Z, a-z, 0-9 และอักขระพิเศษ อย่างน้อย 8 ตัว';
                password.setCustomValidity('Pattern');
            } else {
                password.setCustomValidity('');
            }
    
            let score = 0;
            if (val.length > 0) {
                score = 1; // ระดับ 1: พิมพ์อะไรก็ได้ (สีแดง)
                
                const hasUpper = /[A-Z]/.test(val);
                const hasLower = /[a-z]/.test(val);
                const hasNumber = /[0-9]/.test(val);
                const hasSpecial = /[^a-zA-Z0-9]/.test(val); 
                
                // ตรวจเช็กเงื่อนไขขั้นต่ำตามที่ HTML บังคับ (อักขระพิเศษ + พิมพ์ใหญ่ + พิมพ์เล็ก + เลข + ยาว 8)
                if (val.length >= 8 && hasUpper && hasLower && hasNumber && hasSpecial) {
                    score = 2; // ระดับ 2: ผ่านเกณฑ์ (สีเหลือง)
                    
                    if (val.length >= 12) {
                        score = 3; // ระดับ 3: ปลอดภัยมาก ยาว 12 ตัวขึ้นไป (สีเขียว)
                    }
                }
            }
    
            if (passwordStrengthBar) {
                const colors = ['bg-danger', 'bg-warning', 'bg-success']; 
                const widths = ['0%', '33%', '66%', '100%'];
                
                passwordStrengthBar.style.width = widths[score];
                passwordStrengthBar.className = `progress-bar ${score > 0 ? colors[score - 1] : ''}`;
            }

            if(confirm.value !== '') {
                if (confirm.value !== password.value) {
                    confirm.setCustomValidity('Mismatch');
                    confirmFeedback.textContent = 'รหัสผ่านไม่ตรงกัน';
                } else {
                    confirm.setCustomValidity('');
                }
            }
        }); 
    
        // ยืนยันรหัสผ่าน
        confirm.addEventListener('input', () => {
            if (confirm.value === '') {
                confirm.setCustomValidity('Empty');
                confirmFeedback.textContent = 'กรุณากรอกรหัสผ่านยืนยันก่อน';
            } else if (confirm.value !== password.value) {
                confirm.setCustomValidity('Mismatch');
                confirmFeedback.textContent = 'รหัสผ่านไม่ตรงกัน';
            } else {
                confirm.setCustomValidity('');
            }
        }); 
    
    });
    
    // ฟังก์ชันจัดการคลิกเปิด-ปิดตาลูกตา
    const setupPasswordToggle = (inputId, iconId) => {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (input && icon) {
            icon.addEventListener('click', () => {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('bi-eye');
                    icon.classList.add('bi-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('bi-eye-slash');
                    icon.classList.add('bi-eye');
                }
            });
        }
    };
    setupPasswordToggle('inputPassword', 'togglePassword');
    setupPasswordToggle('confirmPassword', 'toggleConfirmPassword');
    
    // โค้ดสำหรับพรีวิวรูปภาพ Profile เป็น Base64
    const inputPic = document.getElementById('inputPic');
    if (inputPic) {
        inputPic.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (!file) return;
    
            if (!file.type.startsWith('image/')) {
                alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (jpeg, png)');
                this.value = '';
                return;
            }
    
            const reader = new FileReader();
            reader.onload = e => {
                const preview = document.getElementById('previewProfile');
                if (preview) preview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    let licenseFileBase64 = null;
    const inputLicFile = document.getElementById('inputLicFile'); 
    if (inputLicFile) {
        inputLicFile.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (!file) return;

            // ดักประเภทไฟล์ด้วย 
            // if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
            //     alert('กรุณาอัปโหลดไฟล์ PDF หรือรูปภาพเท่านั้น');
            //     this.value = '';
            //     return;
            // }

            const reader = new FileReader();
            reader.onload = e => {
                // เก็บ Base64 ไว้เตรียมส่งตอนกด Submit
                licenseFileBase64 = e.target.result; 
            };
            reader.readAsDataURL(file);
        });
    }

    const loadProvinces = async () => {
        try {
            const provRes = await fetch('http://localhost:3000/lawyer/provinces');
            const provinces = await provRes.json();
            const provSelect = document.getElementById('inputProvince'); 
            
            if (provSelect) {
                provSelect.innerHTML = '<option selected disabled value="">- กรุณาเลือกจังหวัด -</option>';
                provinces.forEach(p => {
                    provSelect.innerHTML += `<option value="${p.id}">${p.name}</option>`;
                });
            }
        } catch (error) {
            console.error("ไม่สามารถโหลดข้อมูลจังหวัดได้:", error);
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadProvinces();
    });


})();