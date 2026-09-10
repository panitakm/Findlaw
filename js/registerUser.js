document.addEventListener('DOMContentLoaded', () => {
    // Hide warnings when typing
    document.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            e.target.classList.remove('is-invalid');
            // Remove custom validation messages explicitly if needed
            if(e.target.id === 'inputPassword' || e.target.id === 'confirmPassword' || e.target.id === 'inputEmail' || e.target.id === 'inputPhone') {
                // Keep the is-invalid removed until submit again
            }
        }
    });

    const form = document.querySelector('.needs-validation');
    const password = document.getElementById('inputPassword');
    const confirm = document.getElementById('confirmPassword');
    const passwordFeedback = document.getElementById('passwordFeedback');
    const confirmFeedback = document.getElementById('confirmFeedback');
    const passwordStrengthBar = document.getElementById('passwordStrengthBar');

    // Password Toggle
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
    setupPasswordToggle('confirmPassword', 'toggleConfirmPassword');

    // Password Strength & Validation
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

        if (passwordStrengthBar) {
            const colors = ['bg-danger', 'bg-warning', 'bg-success']; 
            const widths = ['0%', '33%', '66%', '100%'];
            passwordStrengthBar.style.width = widths[score];
            passwordStrengthBar.className = `progress-bar ${score > 0 ? colors[score - 1] : ''}`;
        }

        // Validate pattern mismatch manually to show custom feedback
        if (val === '') {
            password.setCustomValidity('Empty');
            passwordFeedback.textContent = 'กรุณากรอกรหัสผ่าน';
        } else if (score < 2) {
            password.setCustomValidity('Weak');
            passwordFeedback.textContent = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ';
        } else {
            password.setCustomValidity('');
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

    // Profile Image Preview (Only for UI, backend doesn't store it for users currently)
    const inputPic = document.getElementById('inputPic');
    const previewProfile = document.getElementById('previewProfile');
    if (inputPic && previewProfile) {
        inputPic.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewProfile.src = e.target.result;
                    previewProfile.style.display = 'block';
                    const icon = document.getElementById('profileIcon');
                    if(icon) icon.style.display = 'none';
                    const fb = document.getElementById('picFeedback');
                    if(fb) fb.style.display = 'none';
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // Form Submission
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        let isPicValid = true;
        if (!document.getElementById('inputPic').files.length) {
            document.getElementById('picFeedback').style.display = 'block';
            isPicValid = false;
        } else {
            document.getElementById('picFeedback').style.display = 'none';
        }

        // Check if all fields are valid
        if (!form.checkValidity() || !isPicValid) {
            event.stopPropagation();
            form.querySelectorAll('input, select, textarea').forEach(input => {
                if (!input.checkValidity()) {
                    input.classList.add('is-invalid');
                } else {
                    input.classList.remove('is-invalid');
                    input.classList.add('is-valid');
                }
            });
            return;
        }

        const profileImgSrc = previewProfile ? previewProfile.src : '';
        const profilePicData = profileImgSrc.includes('data:image') ? profileImgSrc : null;

        const requestData = {
            inputFirsname: document.getElementById('inputFirsname').value,
            inputLastname: document.getElementById('inputLastname').value,
            inputEmail: document.getElementById('inputEmail').value,
            inputPassword: password.value,
            profilePic: profilePicData
        };

        const submitBtn = document.querySelector('.btn-submit');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'กำลังสมัครสมาชิก...';

        try {
            const response = await fetch('http://localhost:3000/user/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            const result = await response.json();

            if (response.ok) {
                Swal.fire({
                    title: 'สมัครใช้งานสำเร็จ!',
                    text: 'ระบบจะพาคุณไปยังหน้าเข้าสู่ระบบ',
                    icon: 'success',
                    confirmButtonText: 'ตกลง'
                }).then(() => {
                    window.location.href = '/login.html';
                });
            } else {
                Swal.fire({
                    title: 'เกิดข้อผิดพลาด',
                    text: result.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก',
                    icon: 'error',
                    confirmButtonText: 'ตกลง'
                });
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                title: 'ข้อผิดพลาดเครือข่าย',
                text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง',
                icon: 'error',
                confirmButtonText: 'ตกลง'
            });
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});
