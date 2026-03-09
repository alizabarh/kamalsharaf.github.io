import React, { useState, useEffect } from 'react';
import { Home, Image as ImageIcon, User, MessageCircle, 
  Menu, Settings, Palette, Plus, Trash2, Lock, 
  Facebook, Twitter, Send, X, ChevronRight, 
  ChevronLeft, Download, LogOut, RefreshCw, Edit2, AlertTriangle
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// 🔧 تهيئة Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA2Mmbclcu03xafH532Gki8QY-SiA0JAP8",
  authDomain: "kamal-gallery.firebaseapp.com",
  projectId: "kamal-gallery",
  storageBucket: "kamal-gallery.firebasestorage.app",
  messagingSenderId: "242508713403",
  appId: "1:242508713403:web:788c8433c4c898127b889e"
};

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase initialization error", e);
}
const appId = typeof __app_id !== 'undefined' ? __app_id : 'karikater-app-default';

const App = () => {
  // 📱 حالات الواجهة والتنقل
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(''); // حالة مخصصة لخطأ المصادقة

  // 🔔 نظام الإشعارات والتأكيد المخصص
  const [toast, setToast] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);

  // 💾 حالات البيانات
  const [imagesData, setImagesData] = useState([]);
  const [artistImage, setArtistImage] = useState('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400');
  
  // 🔍 حالات معاينة الصورة
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const galleryImages = imagesData.filter(img => img.category === 'gallery' || img.category === 'latest' || img.url);

  // 🔐 حالات لوحة الإدارة
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('123456');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // 📝 حالات النماذج
  const [newImage, setNewImage] = useState({ title: '', url: '', category: 'latest' });
  const [editingImage, setEditingImage] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [newArtistImageInput, setNewArtistImageInput] = useState('');

  // إظهار إشعار
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  // 🔤 تسجيل الدخول (Firebase Auth) وجلب البيانات
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        // الاعتماد على الدخول المجهول للاتصال بقاعدة بياناتك
        await signInAnonymously(auth);
        setAuthError(''); // مسح الخطأ في حال النجاح
      } catch (e) { 
        console.error("Auth Error", e);
        if (e.code === 'auth/admin-restricted-operation' || e.message.includes('admin-restricted')) {
            setAuthError('يرجى الذهاب إلى موقع Firebase > Authentication > Sign-in method وتفعيل خيار "Anonymous" (المجهول) لتتمكن من تشغيل التطبيق وجلب البيانات.');
        } else if (e.code === 'auth/unauthorized-domain') {
            setAuthError('النطاق الحالي غير مصرح له بالاتصال بـ Firebase. يرجى إضافته في إعدادات Authentication > Authorized domains.');
        } else {
            setAuthError(`حدث خطأ في المصادقة: ${e.message}`);
        }
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, setUser);
    
    // تحميل الخط
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
        unsubscribeAuth();
        document.head.removeChild(link);
    }
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    // استماع للصور
    const imagesRef = collection(db, 'artifacts', appId, 'public', 'data', 'images');
    const unsubscribeImages = onSnapshot(imagesRef, (snapshot) => {
      const images = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // ترتيب زمني تنازلي محلياً
      images.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setImagesData(images);
    }, (error) => console.error(error));

    // جلب الإعدادات
    const fetchSettings = async () => {
        try {
            const settingsDoc = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'app_config'));
            if (settingsDoc.exists()) {
                const data = settingsDoc.data();
                if (data.artistImage) setArtistImage(data.artistImage);
                if (data.adminPassword) setAdminPassword(data.adminPassword);
            }
        } catch (e) { console.error(e); }
    };
    fetchSettings();

    return () => unsubscribeImages();
  }, [user]);

  // 🛠️ دوال المعرض
  const openFullscreen = (item) => {
    const index = galleryImages.findIndex(img => img.id === item.id);
    if (index !== -1) setSelectedImageIndex(index);
  };

  const closeFullscreen = () => setSelectedImageIndex(null);

  const nextImage = (e) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const downloadImage = (e, url, title) => {
    e.stopPropagation();
    if (!url) return;
    // Download logic
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'karikater'}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 🛠️ دوال الإدارة (Firebase CRUD)
  const handleAddImage = async () => {
    if (!newImage.title || !newImage.url) {
        showToast('يرجى إدخال العنوان ورابط الصورة');
        return;
    }
    if (!user) { showToast('غير مصرح لك - يرجى إصلاح أخطاء المصادقة أولاً'); return; }
    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'images'), {
            ...newImage,
            createdAt: Date.now()
        });
        setNewImage({ title: '', url: '', category: 'latest' });
        showToast('تمت إضافة العمل بنجاح!');
    } catch (e) { showToast('خطأ في الإضافة'); console.error(e); }
  };

  const handleUpdateImage = async () => {
    if (!editingImage.title || !editingImage.url) return;
    if (!user) return;
    try {
        const imageRef = doc(db, 'artifacts', appId, 'public', 'data', 'images', editingImage.id);
        await updateDoc(imageRef, {
            title: editingImage.title,
            url: editingImage.url,
            category: editingImage.category
        });
        setEditingImage(null);
        showToast('تم تحديث بيانات الصورة بنجاح!');
    } catch (e) { showToast('خطأ في التحديث'); }
  };

  const executeDeleteImage = async (id) => {
    if (!user) return;
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'images', id));
        showToast('تم الحذف بنجاح');
    } catch (e) { showToast('خطأ في الحذف'); }
  };

  const handleDeleteImageClick = (id) => {
      setConfirmDialog({
          message: 'هل أنت متأكد من حذف هذا العمل نهائياً؟',
          onConfirm: () => {
              executeDeleteImage(id);
              setConfirmDialog(null);
          }
      });
  };

  const handleUpdateArtistImage = async () => {
    if (!newArtistImageInput || !user) return;
    try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'app_config'), { artistImage: newArtistImageInput }, { merge: true });
        setArtistImage(newArtistImageInput);
        setNewArtistImageInput('');
        showToast('تم تحديث صورة الفنان بنجاح');
    } catch (e) { showToast('خطأ في التحديث'); }
  };

  const handleUpdatePassword = async () => {
    if (newPasswordInput.length < 4) { showToast('يجب أن تكون كلمة السر 4 أرقام على الأقل'); return; }
    if (!user) return;
    try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'app_config'), { adminPassword: newPasswordInput }, { merge: true });
        setAdminPassword(newPasswordInput);
        setNewPasswordInput('');
        showToast('تم تغيير كلمة السر بنجاح');
    } catch (e) { showToast('خطأ في تغيير كلمة السر'); }
  };

  const handleLogin = () => {
    if (passwordInput === adminPassword) {
      setIsAdminAuthenticated(true);
      setActiveTab('admin');
      setPasswordInput('');
      setLoginError('');
    } else {
      setLoginError('كلمة المرور غير صحيحة!');
    }
  };

  const handleLogout = () => {
    setIsAdminAuthenticated(false);
    setActiveTab('home');
  };

  return (
    <div 
      dir="rtl" 
      style={{ fontFamily: "'Cairo', sans-serif" }}
      className="min-h-screen selection:bg-[#A49156] selection:text-white"
    >
      {/* 🔔 الإشعارات (Toast) */}
      {toast && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-black text-[#E5CF9F] px-6 py-3 rounded-full font-bold shadow-2xl z-[999] animate-in text-center w-[90%] md:w-auto">
              {toast}
          </div>
      )}

      {/* ⚠️ نافذة التأكيد (Confirm Dialog) */}
      {confirmDialog && (
          <div className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center p-4 backdrop-blur-sm animate-in">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border-2 border-black">
                  <h3 className="text-xl font-black mb-6">{confirmDialog.message}</h3>
                  <div className="flex gap-4">
                      <button onClick={confirmDialog.onConfirm} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700">نعم، متأكد</button>
                      <button onClick={() => setConfirmDialog(null)} className="flex-1 bg-gray-200 text-black py-3 rounded-xl font-bold hover:bg-gray-300">إلغاء</button>
                  </div>
              </div>
          </div>
      )}

      <div className="w-full bg-white relative overflow-hidden flex flex-col h-screen">
        
        {/* 🎨 الخلفية المتدرجة */}
        <div 
          className="absolute inset-0 z-0"
          style={{ background: 'linear-gradient(to left, #A49156 50%, #DBC193 50%)' }}
        ></div>

        <div className="relative z-10 flex flex-col h-full overflow-y-auto pb-24 scrollbar-hide">
          
          {/* 🔝 الشريط العلوي */}
          {(activeTab === 'home' || activeTab === 'admin' || activeTab === 'login') && (
            <header className="flex items-center justify-between p-4 md:px-10 text-black sticky top-0 z-50">
              <Menu className="w-8 h-8 md:w-10 md:h-10 cursor-pointer drop-shadow-md text-black hover:scale-110 active:scale-90 transition-transform" />
              <h1 className="text-2xl md:text-3xl font-black tracking-wide drop-shadow-md">كاريكاتير كمال</h1>
              <div className="w-10 h-10 md:w-12 md:h-12" />
            </header>
          )}

          {/* ⚠️ تنبيه خطأ المصادقة */}
          {authError && (
              <div className="mx-4 md:mx-10 mt-4 bg-red-100 border-2 border-red-500 text-red-800 p-4 rounded-xl shadow-md animate-in flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                      <h4 className="font-black text-lg mb-1">خطأ في إعدادات Firebase!</h4>
                      <p className="font-bold text-sm leading-relaxed">{authError}</p>
                  </div>
              </div>
          )}

          {/* 🏠 تبويب: الرئيسية */}
          {activeTab === 'home' && (
            <div className="flex-1 px-4 md:px-10 space-y-8 md:space-y-12 pb-4 pt-4 max-w-7xl mx-auto w-full">
              <div className="flex gap-2 py-2 overflow-x-auto scrollbar-hide justify-center">
                {['عن الفنان', 'اطلب رسمك الخاص', 'معرض الأعمال'].map((btn, i) => (
                  <button 
                    key={i}
                    onClick={() => btn === 'معرض الأعمال' ? setActiveTab('gallery') : btn === 'عن الفنان' ? setActiveTab('about') : null}
                    className="whitespace-nowrap px-4 py-1.5 md:px-6 md:py-2 rounded-full border border-black bg-[#DBC193]/80 text-black font-bold text-sm md:text-base shadow-sm hover:bg-[#A49156] hover:text-white active:scale-95 transition-all backdrop-blur-sm"
                  >
                    {btn}
                  </button>
                ))}
              </div>

              <div className="flex justify-center mt-2 md:mt-6 relative">
                <div className="w-48 h-48 md:w-64 md:h-64 bg-[#E5CF9F] rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.4)] border-2 border-[#DBC193] flex flex-col items-center justify-center relative z-20 overflow-hidden hover:scale-105 active:scale-95 transition-transform duration-500 cursor-pointer">
                   <h2 className="text-4xl md:text-5xl font-black text-black leading-none mb-1 text-center drop-shadow-sm" style={{fontFamily: "serif"}}>كمال<br/>شرف</h2>
                   <span className="text-xs md:text-sm font-bold text-black tracking-[0.2em] opacity-80 mt-2">KAMAL SHARAF</span>
                </div>
              </div>

              {/* أحدث الأعمال */}
              <section>
                <h3 className="text-xl md:text-2xl font-black text-black mb-4 drop-shadow-sm md:text-right text-center">أحدث الأعمال</h3>
                <div className="flex items-center justify-center gap-3 md:gap-8">
                  {imagesData.filter(img => img.category === 'latest').slice(0, 3).map((item, index) => (
                    <div 
                      key={item.id} 
                      onClick={() => openFullscreen(item)}
                      className={`
                        bg-[#E5CF9F] rounded-xl border-2 border-black flex flex-col items-center p-1 shadow-lg cursor-pointer transition-all duration-300 active:scale-95
                        ${index === 1 ? 'w-32 h-44 md:w-56 md:h-72 scale-110 z-10 shadow-2xl hover:scale-105' : 'w-24 h-36 md:w-40 md:h-56 opacity-90 hover:opacity-100 hover:scale-105'}
                      `}
                    >
                      <div className="w-full flex-1 bg-black/10 rounded-lg overflow-hidden flex items-center justify-center">
                        {item.url ? (
                          <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 md:w-10 md:h-10 text-black/30" />
                        )}
                      </div>
                      <p className="text-[10px] md:text-sm font-bold text-black text-center w-full mt-1 md:mt-2 truncate px-1">
                        {item.title}
                      </p>
                    </div>
                  ))}
                  {imagesData.filter(img => img.category === 'latest').length === 0 && (
                      <p className="text-center font-bold text-black/50">
                        {authError ? "تنتظر ربط قاعدة البيانات..." : "لا توجد أعمال مضافة حالياً"}
                      </p>
                  )}
                </div>
              </section>

              {/* الأزرار الكبيرة */}
              <section className="grid grid-cols-2 gap-4 md:gap-10 pb-2 max-w-5xl mx-auto">
                {[
                  { title: 'أعمالي', desc: 'شاهد مجموعة الكاريكاتير', icon: Palette, tab: 'gallery' },
                  { title: 'معرض', desc: 'قم بجولة في الأعمال الإبداعية', icon: ImageIcon, tab: 'gallery' }
                ].map((btn, i) => (
                  <div 
                    key={i}
                    onClick={() => setActiveTab(btn.tab)}
                    className="bg-gradient-to-br from-[#F5D86A] to-[#E3BE39] rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl border-2 border-[#D4AF37] cursor-pointer hover:scale-105 active:scale-95 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2 md:mb-4">
                      <h4 className="font-black text-lg md:text-2xl text-black group-hover:text-white transition-colors">{btn.title}</h4>
                      <btn.icon className="w-8 h-8 md:w-12 md:h-12 text-[#A49156] group-hover:text-white transition-colors" />
                    </div>
                    <p className="text-xs md:text-base text-black/80 font-bold leading-relaxed group-hover:text-white/90">
                      {btn.desc}
                    </p>
                  </div>
                ))}
              </section>
            </div>
          )}

          {/* 🖼️ تبويب: معرض الأعمال */}
          {activeTab === 'gallery' && (
            <div className="flex-1 px-4 md:px-10 pt-8 max-w-7xl mx-auto w-full">
              <h3 className="text-3xl md:text-4xl font-black text-black mb-8 text-center drop-shadow-md">المعرض الكامل</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 pb-8">
                {imagesData.filter(img => img.category === 'gallery' || img.category === 'latest').map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openFullscreen(item)}
                    className="bg-[#E5CF9F] rounded-xl border-2 border-black aspect-square flex flex-col items-center justify-center shadow-lg relative overflow-hidden group p-1 md:p-2 cursor-pointer active:scale-95 transition-all"
                  >
                    <div className="w-full h-full rounded-lg overflow-hidden bg-black/5 flex flex-col items-center justify-center">
                      {item.url ? (
                          <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                          <div className="flex flex-col items-center opacity-40">
                              <ImageIcon className="w-8 h-8 md:w-12 md:h-12 mb-2 text-black" />
                              <span className="text-[10px] md:text-xs font-bold text-black">صورة فارغة</span>
                          </div>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/80 text-white flex items-center justify-center p-2 text-center font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-sm md:text-base">{item.title}</span>
                    </div>
                  </div>
                ))}
                {imagesData.filter(img => img.category === 'gallery' || img.category === 'latest').length === 0 && (
                    <div className="col-span-full text-center font-bold opacity-50 py-10">
                        {authError ? "تنتظر ربط قاعدة البيانات..." : "لا توجد أعمال في المعرض"}
                    </div>
                )}
              </div>
            </div>
          )}

          {/* 👤 تبويب: عن الفنان */}
          {activeTab === 'about' && (
            <div className="flex-1 px-6 md:px-10 flex flex-col items-center pt-10 space-y-6 max-w-4xl mx-auto w-full">
              <h3 className="text-3xl md:text-4xl font-black text-black mb-4 flex items-center gap-3 drop-shadow-md">
                <User className="w-8 h-8 md:w-10 md:h-10" /> عن الفنان
              </h3>
              
              <div className="w-56 h-56 md:w-72 md:h-72 bg-[#E5CF9F] rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.4)] border-4 border-[#DBC193] overflow-hidden flex items-center justify-center">
                 {artistImage ? (
                   <img src={artistImage} alt="كمال شرف" className="w-full h-full object-cover" />
                 ) : (
                   <User className="w-20 h-20 text-gray-400" />
                 )}
              </div>

              <div className="bg-[#E5CF9F] border-2 border-black rounded-3xl md:rounded-[40px] p-6 md:p-12 shadow-xl w-full text-center relative overflow-hidden mt-4">
                <div className="absolute top-0 right-0 w-16 h-16 md:w-32 md:h-32 bg-black/5 rounded-bl-full"></div>
                <h4 className="text-2xl md:text-4xl font-black text-black mb-4 md:mb-6 relative z-10">كمال شرف</h4>
                <p className="text-sm md:text-xl text-black/80 leading-loose md:leading-loose font-bold relative z-10">
                  رسام كاريكاتير وفنان تشكيلي محترف. يسعى دائماً لتقديم أعمال فنية إبداعية تجمع بين النقد الساخر والجماليات البصرية.
                  متخصص في رسم الشخصيات، الكاريكاتير المخصص، وتصميم الشعارات بأسلوب فني فريد يعكس روح الإبداع والتميز.
                </p>
              </div>
            </div>
          )}

          {/* 📞 تبويب: تواصل */}
          {activeTab === 'contact' && (
            <div className="flex-1 px-6 md:px-10 flex flex-col items-center pt-10 space-y-8 max-w-3xl mx-auto w-full">
              <h3 className="text-3xl md:text-4xl font-black text-black mb-6 flex items-center gap-3 drop-shadow-md">
                <MessageCircle className="w-8 h-8 md:w-10 md:h-10" /> تواصل معي
              </h3>
              
              <div className="w-full space-y-5 md:space-y-6">
                <a href="#" className="w-full bg-[#1877F2] text-white p-5 md:p-6 rounded-2xl md:rounded-3xl flex items-center justify-center gap-4 shadow-lg hover:scale-105 active:scale-95 transition-all">
                  <Facebook className="w-8 h-8 md:w-10 md:h-10 fill-current" />
                  <span className="font-black text-xl md:text-2xl">فيسبوك</span>
                </a>
                <a href="#" className="w-full bg-black text-white p-5 md:p-6 rounded-2xl md:rounded-3xl flex items-center justify-center gap-4 shadow-lg hover:scale-105 active:scale-95 transition-all">
                  <Twitter className="w-8 h-8 md:w-10 md:h-10 fill-current" />
                  <span className="font-black text-xl md:text-2xl">إكس (X)</span>
                </a>
                <a href="#" className="w-full bg-[#2AABEE] text-white p-5 md:p-6 rounded-2xl md:rounded-3xl flex items-center justify-center gap-4 shadow-lg hover:scale-105 active:scale-95 transition-all">
                  <Send className="w-8 h-8 md:w-10 md:h-10 fill-current" />
                  <span className="font-black text-xl md:text-2xl">تليجرام</span>
                </a>
              </div>
            </div>
          )}

          {/* 🔐 شاشة تسجيل الدخول */}
          {activeTab === 'login' && !isAdminAuthenticated && (
            <div className="flex-1 px-6 flex flex-col items-center pt-20">
              <div className="bg-[#E5CF9F] border-4 border-black rounded-3xl p-8 shadow-2xl w-full max-w-md flex flex-col items-center">
                <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center mb-6">
                  <Lock className="w-10 h-10 text-[#E5CF9F]" />
                </div>
                <h3 className="text-2xl font-black text-black mb-6">دخول الإدارة</h3>
                <input
                  type="password"
                  placeholder="كلمة المرور..."
                  className="w-full p-4 rounded-xl border-2 border-black text-center mb-4 font-black text-lg focus:outline-none"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
                {loginError && <p className="text-red-600 font-bold mb-4">{loginError}</p>}
                <button
                  onClick={handleLogin}
                  className="w-full bg-black text-[#E5CF9F] font-black p-4 rounded-xl hover:bg-gray-800 transition-colors active:scale-95"
                >
                  دخول
                </button>
              </div>
            </div>
          )}

          {/* ⚙️ لوحة تحكم الآدمن */}
          {activeTab === 'admin' && isAdminAuthenticated && (
            <div className="flex-1 px-4 md:px-10 pb-8 space-y-6 max-w-5xl mx-auto w-full pt-4">
              <div className="bg-black text-[#E5CF9F] p-4 rounded-2xl flex items-center justify-between shadow-lg">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Settings className="w-6 h-6" /> لوحة التحكم (سحابية)
                </h3>
                <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 active:scale-90 transition-all hover:bg-red-700">
                  <LogOut size={18} /> خروج
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. إضافة أو تعديل عمل */}
                <div className="bg-white/90 border-2 border-black rounded-2xl p-5 shadow-md">
                  <h4 className="font-black mb-4 flex items-center gap-2">
                    {editingImage ? <Edit2 size={20}/> : <Plus size={20}/>}
                    {editingImage ? 'تحديث بيانات العمل' : 'إضافة عمل جديد'}
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="text" placeholder="عنوان العمل..."
                      className="w-full p-3 rounded-lg border border-gray-300 focus:border-black outline-none font-bold"
                      value={editingImage ? editingImage.title : newImage.title}
                      onChange={e => editingImage ? setEditingImage({...editingImage, title: e.target.value}) : setNewImage({...newImage, title: e.target.value})}
                    />
                    <input
                      type="text" placeholder="رابط الصورة..."
                      className="w-full p-3 rounded-lg border border-gray-300 focus:border-black outline-none text-left"
                      dir="ltr" value={editingImage ? editingImage.url : newImage.url}
                      onChange={e => editingImage ? setEditingImage({...editingImage, url: e.target.value}) : setNewImage({...newImage, url: e.target.value})}
                    />
                    <select
                      className="w-full p-3 rounded-lg border border-gray-300 font-bold"
                      value={editingImage ? editingImage.category : newImage.category}
                      onChange={e => editingImage ? setEditingImage({...editingImage, category: e.target.value}) : setNewImage({...newImage, category: e.target.value})}
                    >
                      <option value="latest">أحدث الأعمال (الرئيسية)</option>
                      <option value="gallery">المعرض العام</option>
                      <option value="services">خدمات التصميم</option>
                    </select>
                    <div className="flex gap-2">
                        <button
                            onClick={editingImage ? handleUpdateImage : handleAddImage}
                            className={`flex-1 ${editingImage ? 'bg-blue-600' : 'bg-[#A49156]'} text-white font-black p-3 rounded-lg hover:opacity-80 transition-all`}
                        >
                          {editingImage ? 'حفظ التعديلات' : 'إضافة وحفظ سحابي'}
                        </button>
                        {editingImage && (
                            <button onClick={() => setEditingImage(null)} className="bg-gray-400 text-white px-4 rounded-lg font-bold">إلغاء</button>
                        )}
                    </div>
                  </div>
                </div>

                {/* 2. تحديث صورة الفنان */}
                <div className="bg-white/90 border-2 border-black rounded-2xl p-5 shadow-md">
                  <h4 className="font-black mb-4 flex items-center gap-2"><RefreshCw size={20}/> تحديث صورة الفنان</h4>
                  <div className="space-y-3">
                    <input
                      type="text" placeholder="رابط الصورة الشخصية..."
                      className="w-full p-3 rounded-lg border border-gray-300 text-left"
                      dir="ltr" value={newArtistImageInput}
                      onChange={e => setNewArtistImageInput(e.target.value)}
                    />
                    <button onClick={handleUpdateArtistImage} className="w-full bg-black text-[#E5CF9F] font-black p-3 rounded-lg hover:bg-gray-800 transition-colors">
                      تحديث الصورة دائمياً
                    </button>
                  </div>
                </div>

                {/* 3. تغيير كلمة السر */}
                <div className="bg-white/90 border-2 border-black rounded-2xl p-5 shadow-md">
                  <h4 className="font-black mb-4 flex items-center gap-2"><Lock size={20}/> تغيير كلمة السر</h4>
                  <div className="space-y-3">
                    <input
                      type="password" placeholder="كلمة السر الجديدة..."
                      className="w-full p-3 rounded-lg border border-gray-300 text-center font-bold"
                      value={newPasswordInput}
                      onChange={e => setNewPasswordInput(e.target.value)}
                    />
                    <button onClick={handleUpdatePassword} className="w-full bg-gray-800 text-white font-black p-3 rounded-lg hover:bg-gray-700 transition-colors">
                      حفظ كلمة السر سحابياً
                    </button>
                  </div>
                </div>

                {/* 4. إدارة الصور (حذف واستبدال) */}
                <div className="bg-white/90 border-2 border-black rounded-2xl p-5 shadow-md md:col-span-2">
                  <h4 className="font-black mb-4 flex items-center gap-2"><Trash2 size={20}/> إدارة الأعمال ({imagesData.length})</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-2 scrollbar-hide">
                    {imagesData.map(img => (
                      <div key={img.id} className="flex items-center gap-3 bg-gray-100 p-2 rounded-xl border border-gray-200 hover:bg-gray-200 transition-colors">
                        <div className="w-12 h-12 rounded bg-gray-300 overflow-hidden shrink-0">
                            {img.url && <img src={img.url} className="w-full h-full object-cover"/>}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="font-bold text-xs truncate">{img.title}</p>
                            <p className="text-[10px] opacity-60">{img.category}</p>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => setEditingImage(img)} className="text-blue-600 p-2 hover:bg-blue-200 rounded-full transition-colors" title="تعديل/استبدال">
                                <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDeleteImageClick(img.id)} className="text-red-500 p-2 hover:bg-red-200 rounded-full transition-colors" title="حذف">
                                <Trash2 size={18} />
                            </button>
                        </div>
                      </div>
                    ))}
                    {imagesData.length === 0 && (
                        <div className="col-span-full text-center text-gray-500 font-bold py-4">لا توجد أعمال مضافة</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 🔍 نافذة العرض بملء الشاشة */}
        {selectedImageIndex !== null && galleryImages[selectedImageIndex] && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in"
            onClick={closeFullscreen}
          >
            <div className="absolute top-4 w-full flex justify-between px-6 z-[110]">
              <button
                onClick={(e) => downloadImage(e, galleryImages[selectedImageIndex].url, galleryImages[selectedImageIndex].title)}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-all active:scale-90"
                title="تحميل الصورة"
              >
                <Download size={28} />
              </button>
              <button
                onClick={closeFullscreen}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-all active:scale-90"
              >
                <X size={28} />
              </button>
            </div>

            <div className="relative w-full max-w-5xl h-[70vh] flex items-center justify-center group">
              <img
                src={galleryImages[selectedImageIndex].url}
                alt={galleryImages[selectedImageIndex].title}
                className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
                onClick={(e) => e.stopPropagation()}
              />
              
              <button
                onClick={prevImage}
                className="absolute right-0 md:-right-16 bg-white/5 hover:bg-white/20 p-4 rounded-full text-white transition-all active:scale-90 hidden md:block"
              >
                <ChevronRight size={40} />
              </button>
              <button
                onClick={nextImage}
                className="absolute left-0 md:-left-16 bg-white/5 hover:bg-white/20 p-4 rounded-full text-white transition-all active:scale-90 hidden md:block"
              >
                <ChevronLeft size={40} />
              </button>
            </div>

            <div className="mt-8 text-center text-white space-y-2">
              <h4 className="text-xl md:text-2xl font-black">{galleryImages[selectedImageIndex].title}</h4>
              <p className="text-sm text-gray-400 font-bold">صورة {selectedImageIndex + 1} من {galleryImages.length}</p>

              <div className="flex gap-10 mt-4 md:hidden">
                <button onClick={prevImage} className="p-3 bg-white/10 rounded-full active:scale-90"><ChevronRight size={32}/></button>
                <button onClick={nextImage} className="p-3 bg-white/10 rounded-full active:scale-90"><ChevronLeft size={32}/></button>
              </div>
            </div>
          </div>
        )}

        {/* 🧭 شريط التنقل السفلي */}
        <nav className="absolute bottom-0 w-full bg-[#1A120A] border-t-2 border-[#DBC193] px-6 md:px-20 py-3 md:py-4 flex justify-between md:justify-center md:gap-16 items-center z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
          {[
            { id: 'home', icon: Home, label: 'الرئيسية' },
            { id: 'gallery', icon: ImageIcon, label: 'الأعمال' },
            { id: 'about', icon: User, label: 'عني' },
            { id: 'contact', icon: MessageCircle, label: 'تواصل' },
            { id: 'login', icon: Settings, label: 'الإدارة' }
          ].map((navItem) => {
            const Icon = navItem.icon;
            const isActive = activeTab === navItem.id || (navItem.id === 'login' && activeTab === 'admin');

            const handleClick = () => {
                if (navItem.id === 'login') {
                    isAdminAuthenticated ? setActiveTab('admin') : setActiveTab('login');
                } else {
                    setActiveTab(navItem.id);
                }
            };

            return (
              <button 
                key={navItem.id}
                onClick={handleClick}
                className={`flex flex-col items-center transition-all duration-300 active:scale-90 ${isActive ? 'text-[#E5CF9F] -translate-y-1' : 'text-gray-500 hover:text-[#DBC193]'}`}
              >
                <Icon className={`w-6 h-6 md:w-8 md:h-8 mb-1 transition-all ${isActive ? 'stroke-[2.5px] drop-shadow-[0_0_10px_rgba(229,207,159,0.5)]' : ''}`} />
                <span className={`text-[11px] md:text-sm font-black transition-all ${isActive ? 'opacity-100' : 'opacity-70'}`}>{navItem.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-in { animation: fadeIn 0.3s ease-out forwards; }
      `}} />
    </div>
  );
};

export default App;
