document.addEventListener('DOMContentLoaded', async () => {
    // 1. Guard Page
    if (!Auth.guardPage(['user', 'lawyer', 'admin'])) return;

    const user = Auth.getUser();
    if (!user) return;

    // Elements
    const inputName = document.getElementById('inputName');
    const inputLastname = document.getElementById('inputLastname');
    const inputEmail = document.getElementById('inputEmail');
    const showPic = document.getElementById('showPic');
    const bannerUsername = document.getElementById('bannerUsername');

    const btnEditProfile = document.getElementById('btnEditProfile');
    const btnCancelEdit = document.getElementById('btnCancelEdit');
    const btnSaveSubmit = document.getElementById('btnSaveSubmit');
    const btnTogglePassword = document.getElementById('btnTogglePassword');
    
    // Data state
    let originalData = {};
    let uploadedImageBase64 = null;

    // Load data from server
    try {
        const response = await fetch(`/users/${user.id}`);
        if (response.ok) {
            const data = await response.json();
            originalData = data;
            
            // Set input values
            if (inputName) inputName.value = data.first_name || '';
            if (inputLastname) inputLastname.value = data.last_name || '';
            if (inputEmail) inputEmail.value = data.email || '';
            
            // Set Banner and profile pic
            if (bannerUsername) bannerUsername.innerText = `${data.first_name || ''} ${data.last_name || ''}`.trim();
            if (showPic && data.image_path) { showPic.src = data.image_path; showPic.style.display = 'block'; }
            else if (showPic) { showPic.style.display = 'none'; }

            // Refresh header just in case
            Auth.updateHeaderProfile();
        }
    } catch (err) {
        console.error("Failed to fetch user data", err);
    }

    // Fetch and update stats
    try {
        const favRes = await fetch(`/users/${user.id}/favorites`);
        if (favRes.ok) {
            const favData = await favRes.json();
            const savedCount = document.getElementById('savedCount');
            if (savedCount) savedCount.innerText = favData.length;
        }

        const revRes = await fetch(`/users/${user.id}/reviews`);
        if (revRes.ok) {
            const revData = await revRes.json();
            const reviewCount = document.getElementById('reviewCount');
            if (reviewCount) reviewCount.innerText = revData.length;
        }
    } catch (err) {
        console.error("Failed to fetch stats", err);
    }

    // Handle Edit Mode Toggle
    if (btnEditProfile) {
        btnEditProfile.addEventListener('click', () => {
            if(inputName) inputName.disabled = false;
            if(inputLastname) inputLastname.disabled = false;
            // email remains disabled and readonly
            
            // Show password fields automatically for verification
            const oldPwd = document.getElementById('oldPassword');
            const newPwd = document.getElementById('newPassword');
            const confirmPwd = document.getElementById('confirmNewpassword');
            if(oldPwd) {
                oldPwd.disabled = false;
                oldPwd.parentElement.parentElement.style.display = 'block'; // Make sure the column is visible if it was hidden
            }
            if(newPwd) newPwd.disabled = false;
            if(confirmPwd) confirmPwd.disabled = false;

            const passwordHintWrapper = document.getElementById('passwordHintWrapper');
            if(passwordHintWrapper) passwordHintWrapper.style.display = 'block';

            btnEditProfile.style.display = 'none';
            if(btnCancelEdit) btnCancelEdit.style.display = 'inline-flex';
            if(btnSaveSubmit) btnSaveSubmit.style.display = 'inline-flex';
        });
    }

    // Handle Cancel Edit
    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', () => {
            // Revert data
            if (inputName) inputName.value = originalData.first_name || '';
            if (inputLastname) inputLastname.value = originalData.last_name || '';
            if (inputEmail) inputEmail.value = originalData.email || '';
            if (showPic && originalData.image_path) { showPic.src = originalData.image_path; showPic.style.display = 'block'; }
            else if (showPic) { showPic.removeAttribute('src'); showPic.style.display = 'none'; }
            uploadedImageBase64 = null;

            // Disable fields
            if(inputName) inputName.disabled = true;
            if(inputLastname) inputLastname.disabled = true;

            // Reset password fields
            const oldPwd = document.getElementById('oldPassword');
            const newPwd = document.getElementById('newPassword');
            const confirmPwd = document.getElementById('confirmNewpassword');
            if(oldPwd) { oldPwd.disabled = true; oldPwd.value = ''; }
            if(newPwd) { newPwd.disabled = true; newPwd.value = ''; }
            if(confirmPwd) { confirmPwd.disabled = true; confirmPwd.value = ''; }

            const passwordStrengthBar = document.getElementById('passwordStrengthBar');
            if (passwordStrengthBar) {
                passwordStrengthBar.style.width = '0%';
                passwordStrengthBar.className = 'progress-bar';
            }

            const passwordHintWrapper = document.getElementById('passwordHintWrapper');
            if(passwordHintWrapper) passwordHintWrapper.style.display = 'none';

            if(btnEditProfile) btnEditProfile.style.display = 'inline-flex';
            btnCancelEdit.style.display = 'none';
            if(btnSaveSubmit) btnSaveSubmit.style.display = 'none';
        });
    }

    const newPassword = document.getElementById('newPassword');
    const passwordStrengthBar = document.getElementById('passwordStrengthBar');
    if (newPassword && passwordStrengthBar) {
        newPassword.addEventListener('input', () => {
            const val = newPassword.value;
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
            passwordStrengthBar.className = 'progress-bar ' + (score > 0 ? colors[score - 1] : '');
        });
    }

    const editForm = document.getElementById('editProfileform'); 
    if (editForm) {
        editForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const oldPassword = document.getElementById('oldPassword') ? document.getElementById('oldPassword').value : '';
            const newPassword = document.getElementById('newPassword') ? document.getElementById('newPassword').value : '';
            const confirmNewpassword = document.getElementById('confirmNewpassword') ? document.getElementById('confirmNewpassword').value : '';

            const isNameChanged = (inputName ? inputName.value.trim() : '') !== (originalData.first_name || '');
            const isLastNameChanged = (inputLastname ? inputLastname.value.trim() : '') !== (originalData.last_name || '');
            const isPasswordChanged = !!(oldPassword || newPassword);
            const isImageChanged = !!uploadedImageBase64;

            if (!isNameChanged && !isLastNameChanged && !isPasswordChanged && !isImageChanged) {
                if (btnCancelEdit) btnCancelEdit.click();
                return;
            }

            if (newPassword || oldPassword || confirmNewpassword) {
                if (!oldPassword) {
                    window.showBSAlert(
                        'เปลี่ยนรหัสผ่านไม่สำเร็จ', 
                        'กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนรหัสผ่าน', 
                        'error'
                    ); return;
                }
                if (!newPassword) {
                    window.showBSAlert(
                        'เปลี่ยนรหัสผ่านไม่สำเร็จ', 
                        'กรุณากรอกรหัสผ่านใหม่', 
                        'error'
                    ); return;
                }
                if (newPassword !== confirmNewpassword) {
                    window.showBSAlert(
                        'เปลี่ยนรหัสผ่านไม่สำเร็จ', 
                        'รหัสผ่านใหม่ไม่ตรงกัน', 
                        'error'
                    ); return;
                }
                if (newPassword === oldPassword) {
                    window.showBSAlert(
                        'เปลี่ยนรหัสผ่านไม่สำเร็จ', 
                        'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน', 
                        'error'
                    ); return;
                }
            }

            const updateData = {
                first_name: inputName ? inputName.value.trim() : '',
                last_name: inputLastname ? inputLastname.value.trim() : '',
                email: inputEmail ? inputEmail.value.trim() : '',
                old_password: oldPassword,
                new_password: newPassword,
                image_path: uploadedImageBase64
            };

            try {
                const response = await fetch(`/users/update/${user.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updateData)
                });

                const result = await response.json();

                if (response.ok) {
                    window.showBSToast('บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว!', 'success');
                    // Update local session
                    user.first_name = updateData.first_name;
                    user.last_name = updateData.last_name;
                    if (result.image_path) {
                        user.image_path = result.image_path;
                    }
                    Auth.setSession(localStorage.getItem('token') || sessionStorage.getItem('token'), user);
                    
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    window.showBSAlert('ข้อผิดพลาด', result.error || 'บันทึกไม่สำเร็จ', 'error');
                }
            } catch (err) {
                window.showBSAlert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
            }
        });
    }
});

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
