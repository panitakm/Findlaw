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
            if (bannerUsername) bannerUsername.innerText = `คุณ ${data.first_name || ''} ${data.last_name || ''}`.trim();
            if (showPic && data.image_path) showPic.src = data.image_path;

            // Refresh header just in case
            Auth.updateHeaderProfile();
        }
    } catch (err) {
        console.error("Failed to fetch user data", err);
    }

    // Fetch and update stats
    try {
        const favRes = await fetch(`http://localhost:3000/users/${user.id}/favorites`);
        if (favRes.ok) {
            const favData = await favRes.json();
            const savedCount = document.getElementById('savedCount');
            if (savedCount) savedCount.innerText = favData.length;
        }

        const revRes = await fetch(`http://localhost:3000/users/${user.id}/reviews`);
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
            if (showPic && originalData.image_path) showPic.src = originalData.image_path;
            else if (showPic) showPic.src = '/css/pic/person-circle.svg';
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

            if(btnEditProfile) btnEditProfile.style.display = 'inline-flex';
            btnCancelEdit.style.display = 'none';
            if(btnSaveSubmit) btnSaveSubmit.style.display = 'none';
        });
    }

    // Handle Image Upload Selection
    const fileInput = document.getElementById('uploadNewpic');
    if (fileInput && showPic) {
        fileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                if (!file.type.match('image.*')) {
                    if (typeof Swal !== 'undefined') {
                        Swal.fire('ข้อผิดพลาด', 'กรุณาเลือกไฟล์รูปภาพเท่านั้น (jpeg, png)', 'error');
                    } else {
                        alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (jpeg, png)');
                    }
                    return; 
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    showPic.src = e.target.result;
                    uploadedImageBase64 = e.target.result;

                    // Automatically show save buttons when image is changed
                    if(btnEditProfile) btnEditProfile.style.display = 'none';
                    if(btnCancelEdit) btnCancelEdit.style.display = 'inline-flex';
                    if(btnSaveSubmit) btnSaveSubmit.style.display = 'inline-flex';
                }
                reader.readAsDataURL(file);
            }
        });
    }

    // Handle Form Submit (Save)
    const editForm = document.getElementById('editProfileform'); 
    if (editForm) {
        editForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const oldPassword = document.getElementById('oldPassword') ? document.getElementById('oldPassword').value : '';
            const newPassword = document.getElementById('newPassword') ? document.getElementById('newPassword').value : '';
            const confirmNewpassword = document.getElementById('confirmNewpassword') ? document.getElementById('confirmNewpassword').value : '';

            // Check if user is editing text fields or just uploading image
            const isEditingTextData = (inputName && !inputName.disabled) || (inputLastname && !inputLastname.disabled);

            if (isEditingTextData && !oldPassword) {
                Swal.fire('ข้อผิดพลาด', 'กรุณากรอกรหัสผ่านเดิมเพื่อยืนยันการบันทึกข้อมูล', 'error');
                return;
            }

            if (newPassword && newPassword !== confirmNewpassword) {
                Swal.fire('ข้อผิดพลาด', 'รหัสผ่านใหม่ไม่ตรงกัน', 'error');
                return;
            }

            // Show loading
            Swal.fire({
                title: 'กำลังบันทึกข้อมูล...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

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
                    Swal.fire({
                        icon: 'success',
                        title: 'สำเร็จ',
                        text: 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว!',
                        showConfirmButton: false,
                        timer: 1500
                    }).then(() => {
                        // Update local session
                        user.first_name = updateData.first_name;
                        user.last_name = updateData.last_name;
                        if (result.image_path) {
                            user.image_path = result.image_path;
                        } else if (updateData.image_path) {
                            user.image_path = updateData.image_path;
                        }
                        Auth.setSession(Auth.getToken(), user); 
                        window.location.reload();
                    });
                } else {
                    Swal.fire('ข้อผิดพลาด', result.error || 'บันทึกไม่สำเร็จ', 'error');
                }
            } catch (err) {
                Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
            }
        });
    }
});