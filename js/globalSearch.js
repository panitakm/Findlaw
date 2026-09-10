document.addEventListener('DOMContentLoaded', () => {
    const filterSelects = document.querySelectorAll('.filter-select');
    const filterBtn = document.getElementById('filterDropdownBtn');

    if (filterSelects.length > 0 && filterBtn) {
        filterSelects.forEach(select => {
            select.addEventListener('change', updateFilterCount);
        });

        function updateFilterCount() {
            let activeCount = 0;
            filterSelects.forEach(select => {
                if (select.value !== "") {
                    activeCount++;
                }
            });

            if (activeCount > 0) {
                filterBtn.textContent = `เลือกแล้ว ${activeCount} เงื่อนไข`;
                filterBtn.classList.add('text-primary', 'fw-bold');
            } else {
                filterBtn.textContent = 'ตัวกรอง';
                filterBtn.classList.remove('text-primary', 'fw-bold');
            }
        }

        // Initialize on load just in case form preserves state
        updateFilterCount();
    }
});
