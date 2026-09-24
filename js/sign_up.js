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

        // Check if all fields are valid
        if (!form.checkValidity()) {
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
        let profilePicData = profileImgSrc.includes('data:image') ? profileImgSrc : null;

        const inputFirsname = document.getElementById('inputFirsname').value.trim();
        const inputLastname = document.getElementById('inputLastname').value.trim();

        if (!profilePicData) {
            profilePicData = generateAvatarBase64(inputFirsname, inputLastname);
        }

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
            const response = await fetch('/user/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            const result = await response.json();

            if (response.ok) {
                window.showBSAlert('สมัครใช้งานสำเร็จ!', 'ระบบจะพาคุณไปยังหน้าเข้าสู่ระบบ', 'success').then(() => {
                    window.location.href = '/sign_in';
                });
            } else {
                window.showBSAlert('เกิดข้อผิดพลาด', result.error || 'เกิดข้อผิดพลาดในการสมัครสมาชิก', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        } catch (error) {
            console.error('Error:', error);
            window.showBSAlert('ข้อผิดพลาดเครือข่าย', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });
});

function generateAvatarBase64(firstName, lastName) {
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');

    const colors = ['#E57373', '#F06292', '#BA68C8', '#9575CD', '#7986CB', '#64B5F6', '#4FC3F7', '#4DD0E1', '#4DB6AC', '#81C784', '#AED581', '#FF8A65', '#D4E157', '#FFD54F', '#FFB74D', '#A1887F', '#90A4AE'];
    const bgColor = colors[Math.floor(Math.random() * colors.length)];

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px "Noto Sans Thai", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let initials = '';
    if (firstName) initials += firstName.charAt(0);
    if (lastName) initials += lastName.charAt(0);
    initials = initials.toUpperCase();
    
    // Adjust y-position slightly for better vertical centering
    ctx.fillText(initials, canvas.width / 2, (canvas.height / 2) + 5);

    return canvas.toDataURL('image/png');
}
