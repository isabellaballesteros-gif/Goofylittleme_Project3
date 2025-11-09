// Add tutorial button to all pages
document.addEventListener('DOMContentLoaded', () => {
    // Don't add button to tutorial page itself
    if (window.location.pathname.includes('tutorial.html')) {
        return;
    }
    
    const tutorialBtn = document.createElement('a');
    tutorialBtn.href = '/tutorial.html';
    tutorialBtn.className = 'tutorial-help-btn';
    tutorialBtn.textContent = 'About Goofy Little Me and Tutorial!';
    tutorialBtn.title = 'Learn about Goofy Little Me and see the tutorial';
    
    document.body.appendChild(tutorialBtn);
});






