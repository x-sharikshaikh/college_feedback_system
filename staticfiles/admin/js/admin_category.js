(function($) {
    $(document).ready(function() {
        // Function to toggle field visibility based on user type
        function toggleFieldsByUserType() {
            var userType = $('#id_user_type').val();
            
            // Find field rows
            var adminCategoryFieldset = $('#add_form fieldset').eq(2); // Admin Info fieldset
            var studentFieldset = $('#add_form fieldset').eq(1); // Student Info fieldset
            
            // Hide all conditional fieldsets first
            adminCategoryFieldset.hide();
            studentFieldset.hide();
            
            // Show relevant fields based on user type
            if (userType === 'admin') {
                adminCategoryFieldset.show();
            } else if (userType === 'student') {
                studentFieldset.show();
            }
        }
        
        // Initial setup
        toggleFieldsByUserType();
        
        // Add change event listener
        $('#id_user_type').change(function() {
            toggleFieldsByUserType();
        });
    });
})(django.jQuery); 