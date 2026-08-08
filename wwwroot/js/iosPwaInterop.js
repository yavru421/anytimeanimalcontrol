// iOS PWA Interop Stub
window.iosPwaInterop = window.iosPwaInterop || {
    isStandalone: function() {
        return ('standalone' in window.navigator) && window.navigator.standalone;
    }
};
