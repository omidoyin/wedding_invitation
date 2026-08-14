import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import axios from 'axios';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';
import { 
  Heart, Calendar, Clock, MapPin, Shirt, Gift, 
  Camera, Upload, Download, CheckCircle, ChevronRight, Info, 
  ChevronDown, Loader2, Sparkles, User, Mail, MessageSquare, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { initializePaystackPayment } from '../utils/paystack';

export default function MainPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);

  // Scroll arrow visibility state
  const [showScrollArrow, setShowScrollArrow] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      
      // Hide when user reaches within 150px of the bottom of the page
      if (scrollTop + windowHeight >= documentHeight - 150) {
        setShowScrollArrow(false);
      } else {
        setShowScrollArrow(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Do NOT call handleScroll() immediately — the page height isn't finalised yet
    // at mount time, so the check would wrongly hide the arrow. Let it default to visible.
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // RSVP success state
  const [rsvpSuccess, setRsvpSuccess] = useState(false);
  const [rsvpData, setRsvpData] = useState(null);
  // Per-attendee inline QR data URLs for success screen
  const [attendeeQRMap, setAttendeeQRMap] = useState({});
  // Seating banner dismiss
  const [seatBannerDismissed, setSeatBannerDismissed] = useState(false);
  
  // Additional guests registration state
  const [showAddGuestForm, setShowAddGuestForm] = useState(false);
  const [additionalGuests, setAdditionalGuests] = useState([{ fullName: '', phoneNumber: '' }]);
  const [addGuestLoading, setAddGuestLoading] = useState(false);

  // Donation / Gift states
  const [donationAmount, setDonationAmount] = useState('100000');
  const [donationDisplay, setDonationDisplay] = useState('₦ 100,000'); // formatted display value
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Format a number string to comma-separated Naira display
  const formatNairaDisplay = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    return '₦ ' + Number(digits).toLocaleString('en-NG');
  };

  // Gallery states
  const [photos, setPhotos] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [guestName, setGuestName] = useState('');

  // Countdown State
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Couple photo carousel
  const [carouselIndex, setCarouselIndex] = useState(0);
  const couplePhotos = ['/img1.jpg', '/img2.jpg', '/img3.jpg', '/img4.jpeg', '/img5.jpeg'];

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
 
  const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // React Hook Form for RSVP
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      attendees: [{ fullName: '', phoneNumber: '' }],
      anyChildren: false,
      childrenCount: 1
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'attendees'
  });

  const attendeeCount = watch('attendees')?.length || 1;
  const anyChildren = watch('anyChildren');

  // Fetch initial details
  useEffect(() => {
    async function loadData() {
      try {
        const inviteRes = await axios.get(`${API_URL}/invite/${token}`);
        setInvite(inviteRes.data);
        
        // If guest already RSVP'd, load their RSVP details
        if (inviteRes.data.rsvpSubmitted && inviteRes.data.rsvp) {
          setRsvpData(inviteRes.data.rsvp);
          setRsvpSuccess(true);
          // Pre-generate inline QR codes for returning visitors
          if (inviteRes.data.rsvp?.attendees?.length) {
            const qrMap = {};
            for (const att of inviteRes.data.rsvp.attendees) {
              try {
                qrMap[att.serialNumber] = await QRCode.toDataURL(att.serialNumber, {
                  margin: 1, width: 120,
                  color: { dark: '#1A0608', light: '#FAF8F5' }
                });
              } catch {}
            }
            setAttendeeQRMap(qrMap);
          }
        }

        const galleryRes = await axios.get(`${API_URL}/gallery`);
        setPhotos(galleryRes.data);
      } catch (err) {
        console.error('Error loading page data:', err);
      } finally {
        setLoading(false);
      }
    }
    if (token) loadData();
  }, [token]);

  // Countdown timer logic
  useEffect(() => {
    const weddingDate = new Date('2026-10-10T12:00:00+01:00').getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = weddingDate - now;

      if (difference < 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Carousel auto-advance every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex(i => (i + 1) % couplePhotos.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [couplePhotos.length]);

  // Handle number of guests change in RSVP form
  const handleGuestCountChange = (count) => {
    const currentLength = fields.length;
    if (count > currentLength) {
      for (let i = currentLength; i < count; i++) {
        append({ fullName: '', phoneNumber: '' });
      }
    } else if (count < currentLength) {
      for (let i = currentLength - 1; i >= count; i--) {
        remove(i);
      }
    }
  };

  // Submit RSVP Form
  const onSubmitRSVP = async (data) => {
    try {
      const res = await axios.post(`${API_URL}/rsvp`, {
        inviteId: invite.id,
        attendees: data.attendees,
        anyChildren: data.anyChildren,
        childrenCount: data.anyChildren ? parseInt(data.childrenCount) : 0
      });
      setRsvpData(res.data);
      setRsvpSuccess(true);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      // Generate inline QR codes for each attendee
      if (res.data?.attendees?.length) {
        const qrMap = {};
        for (const att of res.data.attendees) {
          try {
            qrMap[att.serialNumber] = await QRCode.toDataURL(att.serialNumber, {
              margin: 1, width: 120,
              color: { dark: '#1A0608', light: '#FAF8F5' }
            });
          } catch {}
        }
        setAttendeeQRMap(qrMap);
      }
    } catch (err) {
      console.error('RSVP submission error:', err);
      alert(err.response?.data?.error || 'Failed to submit RSVP.');
    }
  };

  // Add Remaining Unused Guests Handler
  const handleAddRemainingGuests = async (e) => {
    e.preventDefault();
    const validAttendees = additionalGuests.filter(g => g.fullName && g.fullName.trim() !== '');
    if (validAttendees.length === 0) {
      alert('Please enter at least one guest name.');
      return;
    }

    setAddGuestLoading(true);
    try {
      const res = await axios.post(`${API_URL}/rsvp`, {
        inviteId: invite.id,
        attendees: validAttendees
      });

      setRsvpData(res.data);
      setShowAddGuestForm(false);
      setAdditionalGuests([{ fullName: '', phoneNumber: '' }]);

      // Pre-generate inline QR codes for new attendees
      if (res.data?.attendees?.length) {
        const qrMap = { ...attendeeQRMap };
        for (const att of res.data.attendees) {
          try {
            qrMap[att.serialNumber] = await QRCode.toDataURL(att.serialNumber, {
              margin: 1, width: 120,
              color: { dark: '#1A0608', light: '#FAF8F5' }
            });
          } catch {}
        }
        setAttendeeQRMap(qrMap);
      }

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
      alert('Additional guest(s) registered successfully!');
    } catch (err) {
      console.error('Error adding remaining guests:', err);
      alert(err.response?.data?.error || 'Failed to add remaining guests.');
    } finally {
      setAddGuestLoading(false);
    }
  };

  // Support / Gift Payment Handler via Paystack Inline SDK
  const handleSupportPayment = (e) => {
    if (e) e.preventDefault();

    const numAmount = parseFloat(donationAmount);
    if (!numAmount || numAmount <= 0) {
      setPaymentError('Please enter or select a valid gift amount.');
      return;
    }
    if (!donorEmail || !donorEmail.includes('@')) {
      setPaymentError('Please enter a valid email address for your Paystack receipt.');
      return;
    }

    setPaymentError('');
    setPaymentLoading(true);

    const nameToUse = isAnonymous ? 'Anonymous Donor' : (donorName.trim() || 'Generous Guest');

    initializePaystackPayment({
      email: donorEmail.trim(),
      amountNaira: numAmount,
      donorName: nameToUse,
      metadata: {
        message: giftMessage ? giftMessage.trim() : '',
      },
      onSuccess: async (reference) => {
        await verifyAndRecordGift(reference, numAmount, nameToUse);
      },
      onClose: () => {
        setPaymentLoading(false);
      },
      onError: (errMsg) => {
        setPaymentLoading(false);
        setPaymentError(errMsg || 'Could not launch Paystack payment.');
      }
    });
  };

  const verifyAndRecordGift = async (reference, amount, nameUsed) => {
    try {
      const res = await axios.post(`${API_URL}/paystack/verify`, {
        reference,
        amount,
        donorName: nameUsed,
        email: donorEmail.trim(),
        message: giftMessage.trim()
      });

      if (res.data.success || res.data.donation) {
        setDonationSuccess(true);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#F5F5DC', '#D4AF37', '#722F37', '#228B22']
        });
      } else {
        setPaymentError(res.data.error || 'Gift payment verification failed.');
      }
    } catch (err) {
      console.error('Gift verification error:', err);
      // Fallback for UI if network drop occurs after payment popup
      setDonationSuccess(true);
      confetti({ particleCount: 100, spread: 60 });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle Local Check for Paystack redirect returns / fallback links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference');
    const amount = params.get('amount');
    const donor = params.get('donor');

    async function verifyMockDonation() {
      if (reference) {
        setPaymentLoading(true);
        try {
          const res = await axios.post(`${API_URL}/paystack/verify`, {
            reference,
            mockAmount: amount,
            mockDonor: donor
          });
          if (res.data.donation || res.data.success) {
            setDonationSuccess(true);
            confetti({
              particleCount: 120,
              spread: 70,
              colors: ['#F5F5DC', '#D4AF37', '#722F37']
            });
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setPaymentLoading(false);
        }
      }
    }

    verifyMockDonation();
  }, []);

  // Photo Upload Handler
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };
   const handleUploadPhoto = async (e) => {
      e.preventDefault();
      if (!selectedFile) {
        alert('Please select an image file to upload.');
        return;
      }
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        setUploadMsg('Upload is not configured yet. Please contact the hosts.');
        return;
      }
      setUploadLoading(true);
      setUploadMsg('');
  
      try {
        // Step 1: Upload directly to Cloudinary from the browser
        const cloudinaryForm = new FormData();
        cloudinaryForm.append('file', selectedFile);
        cloudinaryForm.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        cloudinaryForm.append('folder', 'gallery');
  
        const cloudinaryRes = await axios.post(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          cloudinaryForm
        );
  
        const { secure_url, public_id } = cloudinaryRes.data;
  
        // Step 2: Save only the URL + metadata to our backend database
        const res = await axios.post(`${API_URL}/gallery/upload`, {
          imageUrl: secure_url,
          cloudinaryId: public_id,
          uploadedBy: guestName
        });
  
        setUploadMsg(res.data.message);
        setSelectedFile(null);
        setGuestName('');
        document.getElementById('file-upload').value = '';
        // fetchPhotos();
      } catch (err) {
        console.error(err);
        setUploadMsg('Failed to upload photo. Only image files (jpg, png, webp) under 10MB are accepted.');
      } finally {
        setUploadLoading(false);
      }
    };

  // const handleUploadPhoto = async (e) => {
  //   e.preventDefault();
  //   if (!selectedFile) {
  //     alert('Please select an image file to upload.');
  //     return;
  //   }
  //   setUploadLoading(true);
  //   setUploadMsg('');

  //   const formData = new FormData();
  //   formData.append('photo', selectedFile);
  //   formData.append('uploadedBy', guestName);

  //   try {
  //     const res = await axios.post(`${API_URL}/gallery/upload`, formData, {
  //       headers: { 'Content-Type': 'multipart/form-data' }
  //     });
  //     setUploadMsg(res.data.message);
  //     setSelectedFile(null);
  //     setGuestName('');
  //     // Reset file input
  //     document.getElementById('file-upload').value = '';
  //   } catch (err) {
  //     console.error('Upload photo error:', err);
  //     setUploadMsg('Failed to upload photo. Only image files under 10MB are accepted.');
  //   } finally {
  //     setUploadLoading(false);
  //   }
  // };

  const downloadQRCode = () => {
    if (!rsvpData?.qrCode) return;
    const link = document.createElement('a');
    link.href = rsvpData.qrCode;
    link.download = `AALOVESTORY2026-RSVP-${rsvpData.serialNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAttendeeQRCard = async (attendee, familyName) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      
      // 1. Draw Background Gradient (Deep Wine)
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#3D1B1E');
      grad.addColorStop(1, '#1A0608');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 2. Draw Gold Double Borders
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
      ctx.lineWidth = 1;
      ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);
      
      // 3. Draw Corner Ornaments (Simple elegant lines)
      const drawCorner = (x, y, dx, dy) => {
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + dx * 20, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + dy * 20);
        ctx.stroke();
      };
      drawCorner(35, 35, 1, 1);
      drawCorner(canvas.width - 35, 35, -1, 1);
      drawCorner(35, canvas.height - 35, 1, -1);
      drawCorner(canvas.width - 35, canvas.height - 35, -1, -1);
      
      // 4. Header: "AALOVESTORY26"
      ctx.fillStyle = '#D4AF37';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 24px "Playfair Display", "Georgia", serif';
      ctx.fillText('AALOVESTORY26', canvas.width / 2, 60);
      
      // Gold thin line divider under header
      ctx.beginPath();
      ctx.moveTo(200, 100);
      ctx.lineTo(400, 100);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // 5. Guest Name
      ctx.fillStyle = '#FAF8F5';
      ctx.font = 'bold 36px "Playfair Display", "Georgia", serif';
      const nameY = 145;
      ctx.fillText(attendee.fullName, canvas.width / 2, nameY);
      
      // 6. Registered By (if any)
      let byText = '';
      if (attendee.registeredBy) {
        byText = `(Registered by: ${attendee.registeredBy})`;
      } else if (familyName && attendee.fullName !== familyName && !familyName.includes(attendee.fullName)) {
        byText = `(Registered by: ${familyName} Family)`;
      }
      
      if (byText) {
        ctx.fillStyle = 'rgba(250, 248, 245, 0.7)';
        ctx.font = 'italic 18px "Poppins", "Arial", sans-serif';
        ctx.fillText(byText, canvas.width / 2, nameY + 50);
      }
      
      // 7. QR Code generation & drawing
      const qrDataUrl = await QRCode.toDataURL(attendee.serialNumber, {
        margin: 1,
        width: 260,
        color: {
          dark: '#1A0608',
          light: '#FAF8F5'
        }
      });
      
      const qrImg = new Image();
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });
      
      // Draw QR background card (cream white)
      const qrSize = 280;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 270;
      ctx.fillStyle = '#FAF8F5';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(qrX, qrY, qrSize, qrSize, 20);
      } else {
        ctx.rect(qrX, qrY, qrSize, qrSize);
      }
      ctx.fill();
      
      // Draw QR code image
      ctx.drawImage(qrImg, qrX + 10, qrY + 10, qrSize - 20, qrSize - 20);
      
      // 8. Serial Number below QR
      ctx.fillStyle = '#D4AF37';
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.fillText(attendee.serialNumber, canvas.width / 2, qrY + qrSize + 25);
      
      // 9. Bottom decorative element / text
      ctx.fillStyle = 'rgba(250, 248, 245, 0.5)';
      ctx.font = '14px "Poppins", sans-serif';
      ctx.fillText('PRESENT THIS PASS FOR ADMISSION', canvas.width / 2, canvas.height - 110);
      
      // Heart ornament at bottom
      ctx.fillStyle = '#D4AF37';
      ctx.font = '18px serif';
      ctx.fillText('❤', canvas.width / 2, canvas.height - 75);
      
      // 10. Trigger Download
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `AALOVESTORY26-Pass-${attendee.fullName.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error generating card:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-wedding-darkBg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wedding-gold"></div>
        <p className="font-playfair text-xl mt-4 text-wedding-gold tracking-widest">AALOVESTORY2026</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-wedding-darkBg text-wedding-beige font-poppins selection:bg-wedding-wine selection:text-wedding-gold antialiased">
      
      {/* 1. HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center p-6 border-b border-wedding-gold/10 overflow-hidden">
        {/* Luxury Dark Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#3D1B1E] via-[#240A0C] to-[#120002] z-0"></div>
        
        {/* Sparkle background elements */}
        <div className="absolute top-[20%] left-[10%] w-3 h-3 bg-wedding-gold rounded-full blur-[2px] animate-pulse duration-1000 opacity-60"></div>
        <div className="absolute top-[40%] right-[15%] w-2 h-2 bg-wedding-gold rounded-full blur-[1px] animate-pulse duration-2000 opacity-40"></div>
        <div className="absolute bottom-[30%] left-[20%] w-4 h-4 bg-wedding-gold rounded-full blur-[3px] animate-pulse duration-1000 opacity-30"></div>

        <div className="relative z-10 max-w-3xl flex flex-col items-center">
          <motion.h4 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.8 }}
            className="text-wedding-gold font-playfair tracking-[0.4em] uppercase text-xs sm:text-sm mb-4"
          >
            A & A Love Story
          </motion.h4>
          
          <motion.h1 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 1.2 }}
            className="font-playfair text-5xl sm:text-7xl font-bold tracking-wide text-gold-gradient my-2 leading-tight"
          >
            Ayodeji & Adesewa
          </motion.h1>

          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.7 }} 
            transition={{ delay: 0.5, duration: 1 }}
            className="w-40 h-[1px] bg-gradient-to-r from-transparent via-wedding-gold to-transparent my-6"
          ></motion.div>

          {/* Countdown Clock */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4, duration: 0.8 }}
            className="grid grid-cols-4 gap-3 sm:gap-6 my-6 max-w-lg"
          >
            {Object.entries(timeLeft).map(([label, value]) => (
              <div key={label} className="bg-white/10 backdrop-blur-md px-3 py-4 sm:px-6 sm:py-5 rounded-2xl border border-wedding-gold/30 flex flex-col items-center justify-center min-w-[70px] sm:min-w-[90px]">
                <span className="text-2xl sm:text-4xl font-playfair font-bold text-wedding-gold">{String(value).padStart(2, '0')}</span>
                <span className="text-[10px] sm:text-xs text-[#FAF8F5]/80 uppercase tracking-widest mt-1">{label}</span>
              </div>
            ))}
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.9 }} 
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-[#FAF8F5]/90 text-sm sm:text-base tracking-[0.2em] font-playfair uppercase mt-2 mb-8"
          >
            October 10, 2026 | Ilorin Kwara, Nigeria
          </motion.p>

          {/* Call to Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex flex-wrap justify-center gap-4 mt-2"
          >
            <a href="#rsvp" className="px-8 py-3 bg-wedding-gold text-wedding-wineDark hover:bg-wedding-goldLight hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all duration-300 font-playfair font-bold text-sm tracking-wider rounded-xl shadow-lg border border-wedding-gold/30">
              RSVP NOW
            </a>
            <a href="#gallery" className="px-8 py-3 bg-white/10 backdrop-blur-md text-wedding-lightBeige hover:bg-white/20 transition-all duration-300 font-playfair text-sm tracking-wider rounded-xl shadow-md border border-wedding-gold/30">
              UPLOAD PHOTOS
            </a>
            <a href="#support" className="px-8 py-3 bg-wedding-emerald hover:bg-wedding-emeraldLight text-white transition-all duration-300 font-playfair text-sm tracking-wider rounded-xl shadow-md border border-wedding-emerald/40 hover:border-wedding-gold">
              SUPPORT WEDDING
            </a>
          </motion.div>

        </div>
      </section>

      {/* ── COUPLE PHOTO CAROUSEL ── */}
      <section className="w-full max-w-6xl mx-auto md:px-6 overflow-hidden md:my-8" aria-label="Couple Photos Carousel">
        <div className="relative w-full md:rounded-3xl overflow-hidden shadow-2xl" style={{ height: 'clamp(350px, 55vw, 560px)' }}>
          {couplePhotos.map((src, idx) => (
            <motion.div
              key={src}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{
                opacity: idx === carouselIndex ? 1 : 0,
                scale: idx === carouselIndex ? 1 : 1.04,
              }}
              transition={{ duration: 1.1, ease: 'easeInOut' }}
              style={{ pointerEvents: idx === carouselIndex ? 'auto' : 'none' }}
            >
              <img
                src={src}
                alt={`Couple photo ${idx + 1}`}
                className="w-full h-full object-cover "
                loading="lazy"
              />
              {/* Subtle vignette overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40" />
            </motion.div>
          ))}

          {/* Dot indicators */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
            {couplePhotos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCarouselIndex(idx)}
                aria-label={`Go to photo ${idx + 1}`}
                className={`rounded-full border border-wedding-gold/60 transition-all duration-500 ${
                  idx === carouselIndex
                    ? 'w-6 h-2.5 bg-wedding-gold shadow-[0_0_8px_rgba(212,175,55,0.7)]'
                    : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          {/* Prev / Next arrows */}
          <button
            onClick={() => setCarouselIndex(i => (i - 1 + couplePhotos.length) % couplePhotos.length)}
            aria-label="Previous photo"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/30 border border-wedding-gold/30 text-wedding-gold hover:bg-wedding-wine/60 hover:border-wedding-gold transition-all duration-300 text-lg"
          >
            ‹
          </button>
          <button
            onClick={() => setCarouselIndex(i => (i + 1) % couplePhotos.length)}
            aria-label="Next photo"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/30 border border-wedding-gold/30 text-wedding-gold hover:bg-wedding-wine/60 hover:border-wedding-gold transition-all duration-300 text-lg"
          >
            ›
          </button>
        </div>

        {/* Gold divider below carousel */}
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-wedding-gold/40 to-transparent" />
      </section>

      {/* 2. LOVE STORY SECTION */}
      <section className="md:py-20 py-4  px-4 max-w-4xl mx-auto border-b border-wedding-gold/10">
        <div className="text-center mb-8">
          <Heart className="w-10 h-10 text-wedding-wine mx-auto mb-3 animate-pulse" />
          <h2 className="font-playfair text-3xl sm:text-4xl text-wedding-wine tracking-wider font-bold">Our Love Story</h2>
          <p className="italic text-wedding-wineDark/80 text-sm mt-1">“We met in university and became friends.”</p>
          <div className="w-16 h-[1px] bg-wedding-gold/40 mx-auto mt-4"></div>
        </div>

        {/* Timeline UI */}
        <div className="relative border-l border-wedding-wine/30 ml-4 md:ml-32 pr-4 space-y-12">
          {/* Timeline Node 1 */}
          <div className="relative pl-8">
            <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-wedding-wine border border-wedding-gold"></span>
            <div className="absolute -left-28 top-0 hidden md:block w-24 text-right pr-4">
              <span className="font-playfair text-wedding-wineDark text-xl font-extrabold">2020</span>
            </div>
            <h3 className="font-playfair text-xl text-wedding-wineDark font-bold">The First Encounter</h3>
            <p className="text-sm text-wedding-wineDark/95 mt-1 leading-relaxed">
              The first time we met, neither of us knew that a simple introduction would one day become one of the greatest blessings of our lives and quickly blossomed into endless chats, late-night talks and a deep, unbreakable friendship.
            </p>
          </div>

          {/* Timeline Node 2 */}
          <div className="relative pl-8">
            <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-wedding-emerald border border-wedding-gold"></span>
            <div className="absolute -left-28 top-0 hidden md:block w-24 text-right pr-4">
              <span className="font-playfair text-wedding-wineDark text-xl font-extrabold">2022</span>
            </div>
            <h3 className="font-playfair text-xl text-wedding-wineDark font-bold">More Than Friends</h3>
            <p className="text-sm text-wedding-wineDark/95 mt-1 leading-relaxed">
              After two years of supporting each other's dreams, sharing goals, and walking side by side as best friends, we realized that our hearts were irrevocably bound together.  9 years of Friendship matured into a beautiful romance.
            </p>
          </div>

          {/* Timeline Node 3 */}
          <div className="relative pl-8">
            <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-wedding-wine border border-wedding-gold"></span>
            <div className="absolute -left-28 top-0 hidden md:block w-24 text-right pr-4">
              <span className="font-playfair text-wedding-wineDark text-xl font-extrabold">2024</span>
            </div>
            <h3 className="font-playfair text-xl text-wedding-wineDark font-bold">The Promise</h3>
            <p className="text-sm text-wedding-wineDark/95 mt-1 leading-relaxed">
              Under a canopy of stars on a beautiful evening Ayodeji knelt down and asked Adesewa to spend forever with him. It was an easy, tearful "Yes!".
            </p>
          </div>

          {/* Timeline Node 4 */}
          <div className="relative pl-8">
            <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-wedding-gold border border-wedding-wine"></span>
            <div className="absolute -left-28 top-0 hidden md:block w-24 text-right pr-4">
              <span className="font-playfair text-wedding-wineDark text-xl font-extrabold">2026</span>
            </div>
            <h3 className="font-playfair text-xl text-wedding-wineDark font-bold">The Forever</h3>
            <p className="text-sm text-wedding-wine font-semibold mt-1 leading-relaxed">
              And now, we are counting down the days to say our vows and walk down the aisle into forever in front of our beloved families and friends.
            </p>
          </div>
        </div>
      </section>

      {/* 3. EVENT DETAILS */}
      <section className="py-4 md:py-20 px-3 max-w-5xl mx-auto border-b border-wedding-gold/10">
        <div className="text-center mb-8">
          <Calendar className="w-10 h-10 text-wedding-wine mx-auto mb-3" />
          <h2 className="font-playfair text-3xl sm:text-4xl text-wedding-wine tracking-wider font-bold">Event Details</h2>
          <div className="w-16 h-[1px] bg-wedding-gold/40 mx-auto mt-4"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Card 1: Time */}
          <div className="bg-wedding-wine text-white p-8 rounded-2xl border border-wedding-gold/30 text-center flex flex-col items-center shadow-xl">
            <Clock className="w-8 h-8 text-wedding-gold mb-4 animate-pulse" />
            <h3 className="font-playfair text-lg text-wedding-gold font-bold mb-2">When</h3>
            <p className="text-sm text-wedding-lightBeige font-medium">Saturday, October 10, 2026</p>
            <p className="text-xs text-[#FAF8F5]/80 mt-1">12:00 PM (GMT +1)</p>
          </div>

          {/* Card 2: Venue */}
          <div className="bg-wedding-wine text-white p-8 rounded-2xl border border-wedding-gold/30 text-center flex flex-col items-center shadow-xl">
            <MapPin className="w-8 h-8 text-wedding-gold mb-4 animate-pulse" />
            <h3 className="font-playfair text-lg text-wedding-gold font-bold mb-2">Where</h3>
            <p className="text-sm text-wedding-lightBeige font-medium">Multi-Purpose Hall, University of Ilorin</p>
            <p className="text-xs text-[#FAF8F5]/80 mt-1">Ilorin, Kwara, Nigeria</p>
          </div>

          {/* Card 3: Dress Code */}
          <div className="bg-wedding-wine text-white p-8 rounded-2xl border border-wedding-gold/30 text-center flex flex-col items-center shadow-xl">
            <Shirt className="w-8 h-8 text-wedding-gold mb-4 animate-pulse" />
            <h3 className="font-playfair text-lg text-wedding-gold font-bold mb-2">Dress Code</h3>
            <p className="text-sm text-wedding-lightBeige font-medium">Luxury African Glamour</p>
            <p className="text-xs text-[#FAF8F5]/80 mt-1">Colors: Wine, Beige and Emerald Green</p>
          </div>
        </div>
      

        {/* Map Embed & Dress Code Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          <div className="bg-white p-6 rounded-2xl border-2 border-wedding-wine/10 overflow-hidden h-[300px] shadow-lg">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m12!1m8!1m3!1d15784.939318443474!2d4.670434!3d8.4765321!3m2!1i1024!2i768!4f13.1!2m1!1sUnilorin%20Multi%20Purpose%20Hall%20FMFC%20433%20Ilorin%20240102%20Kwara!5e0!3m2!1sen!2sng!4v1785416241432!5m2!1sen!2sng"
              className="w-full h-full border-0 rounded-lg"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>

          </div>

          <div className="bg-gradient-to-br from-[#3D1B1E] to-[#250E10] text-[#FAF8F5] p-8 rounded-2xl border border-wedding-gold/30 flex flex-col justify-center shadow-xl">
            <h3 className="font-playfair text-xl text-wedding-gold mb-4 flex items-center gap-2 font-bold">
              <Shirt className="w-5 h-5 text-wedding-gold" /> Aso Ebi Inspiration
            </h3>
            <p className="text-sm text-wedding-lightBeige leading-relaxed mb-4">
              To celebrate our heritage and color harmony, we invite our guests to wear our selected colors: <span className="font-semibold text-wedding-gold">Wine</span>  <span className="font-semibold text-wedding-gold">Emerald Green</span> or styled with beautiful  <span className="font-semibold text-wedding-gold">Beige</span> accents.
            </p>
            {/* <p className="text-sm text-wedding-lightBeige/90 leading-relaxed font-semibold">
              For info regarding fabric purchases and tailors, please connect with the Aso Ebi Coordinator: **080-Wedding-Aso-Ebi**.
            </p> */}
          </div>
        </div>
      </section>

      {/* 4. COLOR THEME PALETTE */}
      <section className="md:py-20 py-4 px-3 max-w-4xl mx-auto border-b border-wedding-gold/10">
        <div className="text-center mb-12">
          <h2 className="font-playfair text-2xl sm:text-3xl text-wedding-wine font-bold tracking-wider">Wedding Color Palette</h2>
          <div className="w-16 h-[1px] bg-wedding-gold/40 mx-auto mt-3"></div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {/* Color Card: Wine */}
          <div className="w-14 sm:w-32 text-center">
            <div className="w-14 h-14 sm:w-32 sm:h-32 rounded-2xl bg-wedding-wine border border-wedding-gold/30 shadow-lg mx-auto mb-3"></div>
            <span className="font-playfair text-sm text-wedding-wineDark font-bold">Wine </span>
          </div>

          {/* Color Card: Beige */}
          <div className="w-14 sm:w-32 text-center">
            <div className="w-14 h-14 sm:w-32 sm:h-32 rounded-2xl bg-wedding-lightBeige border border-wedding-gold/30 shadow-lg mx-auto mb-3"></div>
            <span className="font-playfair text-sm text-wedding-wineDark font-bold">Luxury Beige</span>
          </div>

          {/* Color Card: Emerald */}
          <div className="w-14 sm:w-32 text-center">
            <div className="w-14 h-14 sm:w-32 sm:h-32 rounded-2xl bg-wedding-emerald border border-wedding-gold/30 shadow-lg mx-auto mb-3"></div>
            <span className="font-playfair text-sm text-wedding-wineDark font-bold">Emerald Green</span>
          </div>

          {/* Color Card: Gold */}
          <div className="w-14 sm:w-32 text-center">
            <div className="w-14 h-14 sm:w-32 sm:h-32 rounded-2xl bg-wedding-gold border border-wedding-gold/30 shadow-lg mx-auto mb-3"></div>
            <span className="font-playfair text-sm text-wedding-wineDark font-bold">Royal Gold</span>
          </div>
        </div>
      </section>

      {/* 5. RSVP SECTION */}
      <section id="rsvp" className={`md:py-20 py-4 px-3 mx-auto border-b border-wedding-gold/10 scroll-mt-20 transition-all duration-500 ${rsvpSuccess ? 'max-w-4xl' : 'max-w-2xl'}`}>
        <div className="text-center mb-8">
          <Heart className="w-10 h-10 text-wedding-wine mx-auto mb-3" />
          <h2 className="font-playfair text-3xl text-wedding-wine tracking-wider font-bold">RSVP</h2>
          <p className="text-sm text-wedding-wineDark font-medium mt-1">Please confirm your attendance by submitting the RSVP below.</p>
          <div className="w-16 h-[1px] bg-wedding-gold/40 mx-auto mt-4"></div>
        </div>

        {/* RSVP FORM OR SUCCESS SCREEN */}
        <div className="bg-gradient-to-br from-[#3D1B1E] to-[#250E10] text-[#FAF8F5] p-4 rounded-3xl border border-wedding-gold/30 relative overflow-hidden shadow-2xl">
          {/* Gold Decorative Corner Lines */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t border-l border-wedding-gold/20"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-t border-r border-wedding-gold/20"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b border-l border-wedding-gold/20"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b border-r border-wedding-gold/20"></div>

          {!rsvpSuccess ? (
            <form onSubmit={handleSubmit(onSubmitRSVP)} className="space-y-6">
              {/* Max Guest Limits Indicator */}
              <div className="flex items-center gap-3 bg-wedding-wine/45 border border-wedding-wine/20 p-4 rounded-xl">
                <Info className="w-6 h-6 text-wedding-gold shrink-0" />
                <p className="text-xs text-wedding-lightBeige leading-relaxed">
                  Hi <strong className="text-white">{invite?.familyName || 'Guest'}</strong>, you are allocated a maximum of <strong className="text-white">{invite?.maxGuests || 2} guests</strong> (including yourself). Please specify the number of attendees below.

                 
                </p>
                
              </div>
              <p className="text-xs text-wedding-lightBeige leading-relaxed">
                Each Attendee will be given a unique pass to access the event venue.
              </p>

              {/* Instructional slot-selection message */}
              <div className="bg-wedding-gold/10 border border-wedding-gold/30 p-4 rounded-xl">
                {invite?.maxGuests > 1 ? (
                  <p className="text-sm font-bold text-wedding-gold text-center leading-relaxed">
                    👥 Please select the number of guests attending and fill in each person's details below.
                    <span className="block text-xs font-normal text-wedding-lightBeige/90 mt-1">
                      Remember to include yourself in the count.
                    </span>
                  </p>
                ) : (
                  <p className="text-sm font-bold text-wedding-gold text-center leading-relaxed">
                    🎟️ You have been allocated <span className="text-white">1 slot</span> — please select 1 guest (yourself).
                  </p>
                )}
              </div>

              {/* Number of Attendees selector */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-wedding-lightBeige">How many guests are attending?</label>
                <select 
                  onChange={(e) => handleGuestCountChange(parseInt(e.target.value))}
                  className="w-full bg-white border border-wedding-gold/30 rounded-xl px-4 py-3 text-wedding-wineDark font-medium focus:outline-none focus:border-wedding-gold"
                >
                  {Array.from({ length: invite?.maxGuests || 2 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
              </div>

              {/* Attendee Name inputs */}
              <div className="space-y-4 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-wedding-gold">Attendee Details</p>
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-3 p-4 bg-[#240A0C]/50 border border-wedding-gold/15 rounded-xl">
                    <p className="text-xs font-bold text-wedding-gold/80">Guest #{index + 1}</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input
                          type="text"
                          placeholder="Full Name (Required)"
                          {...register(`attendees.${index}.fullName`, { required: 'Name is required' })}
                          className="w-full bg-white border border-wedding-gold/20 rounded-lg px-3 py-2 text-sm text-wedding-wineDark font-medium focus:outline-none focus:border-wedding-gold"
                        />
                        {errors?.attendees?.[index]?.fullName && (
                          <span className="text-[10px] text-red-400 mt-1 block">{errors.attendees[index].fullName.message}</span>
                        )}
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Phone Number (Optional)"
                          {...register(`attendees.${index}.phoneNumber`)}
                          className="w-full bg-white border border-wedding-gold/20 rounded-lg px-3 py-2 text-sm text-wedding-wineDark font-medium focus:outline-none focus:border-wedding-gold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Optional Children attending question */}
              <div className="space-y-3 p-4 bg-[#240A0C]/35 border border-wedding-gold/15 rounded-xl select-none">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="anyChildren"
                    {...register('anyChildren')}
                    className="w-4 h-4 rounded text-wedding-wine bg-white border-wedding-gold/30 focus:ring-wedding-gold cursor-pointer"
                  />
                  <label htmlFor="anyChildren" className="text-xs font-semibold text-wedding-lightBeige cursor-pointer">
                    Any children attending with you?
                  </label>
                </div>

                {anyChildren && (
                  <div className="space-y-1.5 pl-7 animate-fade-in">
                    <label className="block text-[11px] font-medium text-wedding-goldLight">Number of children attending:</label>
                    <select
                      {...register('childrenCount')}
                      className="bg-white border border-wedding-gold/30 rounded-lg px-3 py-1.5 text-xs text-wedding-wineDark font-semibold focus:outline-none focus:border-wedding-gold"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? 'Child' : 'Children'}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="w-full py-4 bg-wedding-gold text-wedding-wineDark hover:bg-wedding-goldLight transition-all duration-300 font-playfair font-bold tracking-widest text-sm rounded-xl border border-wedding-goldLight/20 hover:shadow-lg mt-4"
              >
                SUBMIT RSVP
              </button>
            </form>
          ) : (
            /* RSVP SUCCESS SCREEN */
            <div className="text-center space-y-6 py-4 flex flex-col items-center w-full">
              <CheckCircle className="w-16 h-16 text-wedding-goldLight animate-bounce" />
              <div>
                <h3 className="font-playfair text-2xl text-wedding-gold">RSVP Confirmed!</h3>
                {invite?.isAttendee ? (
                  <p className="text-sm text-wedding-lightBeige mt-1">
                    Welcome back, <strong className="text-white">{invite.currentAttendee?.fullName}</strong>.
                  </p>
                ) : (
                  <p className="text-sm text-wedding-lightBeige mt-1">
                    Thank you for confirming your attendance, {invite?.familyName} Family.
                  </p>
                )}
              </div>

              {/* We show either the single attendee's card OR all attendees' cards */}
              <div className="w-full space-y-8 mt-4">
                {(() => {
                  // Determine which attendees to show
                  const listToShow = invite?.isAttendee && invite?.currentAttendee
                    ? rsvpData?.attendees?.filter(a => a.attendeeToken === invite.currentAttendee.attendeeToken) || [invite.currentAttendee]
                    : rsvpData?.attendees || [];

                  if (listToShow.length === 0) {
                    // Fallback to group QR if no individual attendees are found
                    return (
                      <div className="flex flex-col items-center space-y-6">
                        <div className="bg-[#240A0C] border border-wedding-gold/30 px-6 py-4 rounded-2xl inline-block shadow-md">
                          <span className="text-xs text-wedding-goldLight/80 uppercase tracking-widest font-bold block">Entry Serial Number</span>
                          <span className="text-xl sm:text-2xl font-mono text-wedding-gold font-bold tracking-wider mt-1 block">
                            {rsvpData?.serialNumber || 'AAL-XXXXXX'}
                          </span>
                        </div>

                        {rsvpData?.qrCode && (
                          <div className="bg-white p-3 rounded-2xl inline-block border-2 border-wedding-gold/40 shadow-xl">
                            <img src={rsvpData.qrCode} alt="Entry QR Code" className="w-40 h-40" />
                          </div>
                        )}
                        <button
                          onClick={downloadQRCode}
                          className="px-6 py-2.5 bg-wedding-gold text-wedding-wineDark hover:bg-wedding-goldLight transition-all duration-300 font-playfair font-bold text-xs tracking-wider rounded-lg border border-wedding-goldLight/20 flex items-center justify-center gap-2 hover:shadow-lg"
                        >
                          <Download className="w-4 h-4" /> DOWNLOAD QR CODE
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                      {listToShow.map((att) => {
                        // Generate copyable link
                        const personalLink = `${window.location.origin}/invite/${att.attendeeToken}`;

                        return (
                          <div 
                            key={att.id || att.attendeeToken} 
                            className="bg-[#240A0C]/60 border border-wedding-gold/20 p-6 rounded-2xl flex flex-col items-center text-center shadow-lg relative overflow-hidden group"
                          >
                            {/* Gold header text inside the card */}
                            <div className="text-[9px] text-wedding-gold uppercase tracking-[0.3em] font-semibold mb-3">
                              AALOVESTORY26
                            </div>

                            {/* Attendee name + inline QR side-by-side */}
                            <div className="flex items-center gap-3 w-full justify-center">
                              <div className="text-left">
                                <h4 className="font-playfair text-lg text-white font-bold tracking-wide">
                                  {att.fullName}
                                </h4>
                                {att.registeredBy && (
                                  <p className="text-[10px] text-wedding-lightBeige/60 italic mt-0.5">
                                    (Reg. by: {att.registeredBy})
                                  </p>
                                )}
                              </div>
                              {attendeeQRMap[att.serialNumber] && (
                                <div className="bg-white p-1.5 rounded-lg border border-wedding-gold/30 shrink-0">
                                  <img
                                    src={attendeeQRMap[att.serialNumber]}
                                    alt={`QR for ${att.fullName}`}
                                    className="w-14 h-14"
                                  />
                                </div>
                              )}
                            </div>
                            
                            {/* Serial Number Display */}
                            <div className="mt-4 bg-black/40 border border-wedding-gold/15 px-4 py-2 rounded-xl">
                              <span className="text-[9px] text-wedding-goldLight/80 uppercase tracking-widest block">Entry Pass Code</span>
                              <span className="font-mono text-sm text-wedding-gold font-bold tracking-wider mt-0.5 block">
                                {att.serialNumber}
                              </span>
                            </div>

                            {/* Copy Link & WhatsApp Share */}
                            <div className="mt-4 flex flex-col sm:flex-row gap-2 w-full justify-center">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(personalLink);
                                  alert("Link copied! You can now send it to them on WhatsApp. 🎉");
                                }}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-[#FAF8F5] text-xs font-semibold rounded-lg border border-wedding-gold/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                🔗 Copy Invite Link
                              </button>
                              
                              <a
                                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                  `Hi ${att.fullName}, here is your personal entry pass & details for Ayodeji & Adesewa's wedding (AALOVESTORY2026). Click this link to view your pass: ${personalLink}`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 bg-[#25D366] hover:bg-[#20BA56] text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.965C16.588 1.977 14.13 1.953 12.006 1.953c-5.437 0-9.862 4.371-9.866 9.8.001 2.03.536 4.017 1.554 5.78l-.924 3.38 3.488-.915z"/>
                                </svg>
                                Share on WhatsApp
                              </a>
                            </div>

                            {/* Download Button */}
                            <button
                              type="button"
                              onClick={() => downloadAttendeeQRCard(att, invite?.familyName)}
                              className="mt-3 px-5 py-2.5 bg-wedding-gold text-wedding-wineDark hover:bg-wedding-goldLight transition font-playfair font-bold text-xs tracking-wider rounded-lg border border-wedding-goldLight/20 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" /> Download QR Card (PNG)
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="max-w-xl mx-auto w-full bg-gradient-to-br from-[#3D1B1E] via-[#2A0C10] to-[#1F0709] border-2 border-wedding-gold/60 p-6 sm:p-7 rounded-2xl text-left mt-6 shadow-[0_12px_35px_rgba(0,0,0,0.6)] relative overflow-hidden">
                {/* Gold header divider */}
                <div className="flex items-center gap-2.5 mb-4 border-b border-wedding-gold/30 pb-3">
                  <Info className="w-6 h-6 text-wedding-gold shrink-0 animate-pulse" />
                  <h4 className="text-base sm:text-lg font-playfair font-extrabold uppercase tracking-widest text-wedding-gold">
                    Important Instructions:
                  </h4>
                </div>

                <ul className="text-xs sm:text-sm md:text-base text-[#FAF8F5] space-y-3 font-poppins leading-relaxed">
                  <li className="flex items-start gap-3">
                    <span className="text-wedding-gold text-lg font-bold shrink-0 leading-none mt-0.5">•</span>
                    <span>
                      Please <strong className="text-wedding-gold font-bold underline underline-offset-2">save or download the QR Card(s)</strong> to your device.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-wedding-gold text-lg font-bold shrink-0 leading-none mt-0.5">•</span>
                    <span>
                      Present this serial number or QR card to the <strong className="text-wedding-gold font-bold underline underline-offset-2">check-in bouncers</strong> at the wedding venue entrance.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-wedding-gold text-lg font-bold shrink-0 leading-none mt-0.5">•</span>
                    <span>
                      Each QR code card authorizes entry for <strong className="text-wedding-gold font-bold underline underline-offset-2">one registered guest</strong>.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Add remaining guests form if unused slots exist */}
              {(() => {
                const registeredCount = rsvpData?.attendees?.length || 0;
                const maxSlots = invite?.maxGuests || 0;
                const remainingSlots = maxSlots - registeredCount;

                if (remainingSlots > 0 && !invite?.isAttendee) {
                  return (
                    <div className="max-w-xl mx-auto w-full bg-[#240A0C]/90 border border-wedding-gold/40 p-6 rounded-2xl text-left mt-6 shadow-xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-wedding-gold/20 pb-3">
                        <Plus className="w-5 h-5 text-wedding-gold" />
                        <h4 className="font-playfair text-base font-bold text-wedding-gold">
                          Register Remaining Guest(s) ({remainingSlots} slot{remainingSlots > 1 ? 's' : ''} available)
                        </h4>
                      </div>
                      <p className="text-xs text-wedding-lightBeige/80 leading-relaxed">
                        Your invitation allows up to <strong className="text-wedding-gold">{maxSlots} guests</strong>. You have currently registered <strong className="text-wedding-gold">{registeredCount} guest{registeredCount > 1 ? 's' : ''}</strong>. You can register the remaining {remainingSlots} guest(s) below whenever they are ready.
                      </p>

                      {showAddGuestForm ? (
                        <form onSubmit={handleAddRemainingGuests} className="space-y-4 pt-2">
                          {additionalGuests.map((g, idx) => (
                            <div key={idx} className="p-3.5 bg-black/40 border border-wedding-gold/20 rounded-xl space-y-2">
                              <span className="text-[10px] font-bold text-wedding-gold uppercase tracking-wider block">Additional Guest #{registeredCount + idx + 1}</span>
                              <input
                                type="text"
                                required
                                placeholder="Full Name"
                                value={g.fullName}
                                onChange={(e) => {
                                  const copy = [...additionalGuests];
                                  copy[idx].fullName = e.target.value;
                                  setAdditionalGuests(copy);
                                }}
                                className="w-full bg-white/10 border border-wedding-gold/30 rounded-lg px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-wedding-gold"
                              />
                              <input
                                type="tel"
                                placeholder="Phone Number (optional)"
                                value={g.phoneNumber}
                                onChange={(e) => {
                                  const copy = [...additionalGuests];
                                  copy[idx].phoneNumber = e.target.value;
                                  setAdditionalGuests(copy);
                                }}
                                className="w-full bg-white/10 border border-wedding-gold/30 rounded-lg px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-wedding-gold"
                              />
                            </div>
                          ))}

                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            {additionalGuests.length < remainingSlots && (
                              <button
                                type="button"
                                onClick={() => setAdditionalGuests([...additionalGuests, { fullName: '', phoneNumber: '' }])}
                                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-wedding-gold text-xs font-semibold rounded-lg border border-wedding-gold/30 transition cursor-pointer"
                              >
                                + Add Another Slot
                              </button>
                            )}
                            <button
                              type="submit"
                              disabled={addGuestLoading}
                              className="flex-1 py-3 bg-wedding-gold hover:bg-wedding-goldLight text-wedding-wineDark font-playfair font-bold text-xs rounded-lg transition cursor-pointer disabled:opacity-50 shadow-md"
                            >
                              {addGuestLoading ? 'SAVING GUEST(S)...' : 'CONFIRM ADDITIONAL GUEST(S)'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAdditionalGuests([{ fullName: '', phoneNumber: '' }]);
                            setShowAddGuestForm(true);
                          }}
                          className="w-full py-3 bg-wedding-gold/20 hover:bg-wedding-gold/30 text-wedding-gold border border-wedding-gold/40 rounded-xl text-xs font-playfair font-bold tracking-wider transition cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4 text-wedding-gold" /> ADD REMAINING GUEST(S) NOW
                        </button>
                      )}
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          )}
        </div>
      </section>

      {/* 6. DONATION/SUPPORT SYSTEM */}
      <section id="support" className="md:py-20 py-4 px-3 max-w-2xl mx-auto border-b border-wedding-gold/10 scroll-mt-20">
        <div className="text-center mb-10">
          <Gift className="w-10 h-10 text-wedding-wine mx-auto mb-3" />
          <h2 className="font-playfair text-3xl text-wedding-wine tracking-wider font-bold">Support Our Wedding</h2>
          <p className="text-sm text-wedding-wineDark font-medium mt-1">If you wish to honor us with a financial gift, you can use the secure Paystack checkout below.</p>
          <div className="w-16 h-[1px] bg-wedding-gold/40 mx-auto mt-4"></div>
        </div>

        <div className="bg-gradient-to-br from-[#3D1B1E] to-[#250E10] text-[#FAF8F5] p-6 sm:p-8 rounded-3xl border border-wedding-gold/30 relative overflow-hidden shadow-2xl">
          {/* Gold Decorative Corner Lines */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t border-l border-wedding-gold/20"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-t border-r border-wedding-gold/20"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b border-l border-wedding-gold/20"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b border-r border-wedding-gold/20"></div>

          {!donationSuccess ? (
            <form onSubmit={handleSupportPayment} className="space-y-6">
              {/* Header Badge */}
              <div className="text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-wedding-gold/10 border border-wedding-gold/30 flex items-center justify-center">
                  <Gift className="w-6 h-6 text-wedding-gold" />
                </div>
                <h3 className="font-playfair text-xl text-wedding-gold font-bold tracking-wide">Cash Registry & Financial Gift</h3>
                <p className="text-[#FAF8F5]/80 text-xs sm:text-sm max-w-md mx-auto">
                  Your generosity and presence in our lives mean everything to us. Select or enter an amount to send a gift directly to the couple.
                </p>
              </div>

              {/* Quick Amount Selector Pills */}
              <div className="space-y-2">
                <label className="block text-xs font-playfair tracking-wider text-wedding-gold/90 text-left font-semibold">
                  SELECT GIFT AMOUNT (NGN)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[5000, 10000, 25000, 50000, 100000].map((amt) => {
                    const isSelected = donationAmount === amt.toString();
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setDonationAmount(amt.toString());
                          setDonationDisplay('₦ ' + amt.toLocaleString('en-NG'));
                          setPaymentError('');
                        }}
                        className={`py-2.5 px-1 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-wedding-gold text-[#250E10] border-wedding-gold shadow-md font-extrabold scale-105'
                            : 'bg-black/20 text-[#FAF8F5]/80 border-wedding-gold/20 hover:border-wedding-gold/60 hover:text-white'
                        }`}
                      >
                        ₦{amt >= 1000 ? `${amt / 1000}k` : amt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div className="space-y-1 text-left">
                <label className="block text-xs font-playfair tracking-wider text-wedding-gold/90 font-semibold">
                  CUSTOM GIFT AMOUNT
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-wedding-gold font-bold text-sm">₦</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter amount (e.g. 15,000)"
                    value={donationDisplay}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setDonationAmount(raw);
                      setDonationDisplay(raw ? '₦ ' + Number(raw).toLocaleString('en-NG') : '');
                      setPaymentError('');
                    }}
                    className="w-full bg-black/30 border border-wedding-gold/30 rounded-xl pl-9 pr-4 py-3 text-sm text-[#FAF8F5] placeholder-[#FAF8F5]/30 focus:outline-none focus:border-wedding-gold transition-colors"
                  />
                </div>
              </div>

              {/* Donor Name & Anonymity */}
              <div className="space-y-2 text-left">
                <label className="block text-xs font-playfair tracking-wider text-wedding-gold/90 font-semibold">
                  YOUR NAME / GIFT FROM
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wedding-gold/60" />
                  <input
                    type="text"
                    placeholder="e.g. Chief & Mrs. Adeleke"
                    disabled={isAnonymous}
                    value={isAnonymous ? 'Anonymous Donor' : donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full bg-black/30 border border-wedding-gold/30 rounded-xl pl-10 pr-4 py-3 text-sm text-[#FAF8F5] placeholder-[#FAF8F5]/30 focus:outline-none focus:border-wedding-gold transition-colors disabled:opacity-50"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="anonymous-check"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 accent-wedding-gold rounded border-wedding-gold/40 cursor-pointer"
                  />
                  <label htmlFor="anonymous-check" className="text-xs text-[#FAF8F5]/70 cursor-pointer select-none">
                    Give anonymously (hide my name from public display)
                  </label>
                </div>
              </div>

              {/* Donor Email */}
              <div className="space-y-1 text-left">
                <label className="block text-xs font-playfair tracking-wider text-wedding-gold/90 font-semibold">
                  EMAIL ADDRESS <span className="text-wedding-gold/50 font-normal">(for payment receipt)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wedding-gold/60" />
                  <input
                    type="email"
                    required
                    placeholder="your.email@example.com"
                    value={donorEmail}
                    onChange={(e) => {
                      setDonorEmail(e.target.value);
                      setPaymentError('');
                    }}
                    className="w-full bg-black/30 border border-wedding-gold/30 rounded-xl pl-10 pr-4 py-3 text-sm text-[#FAF8F5] placeholder-[#FAF8F5]/30 focus:outline-none focus:border-wedding-gold transition-colors"
                  />
                </div>
              </div>

              {/* Optional Message / Well Wishes */}
              <div className="space-y-1 text-left">
                <label className="block text-xs font-playfair tracking-wider text-wedding-gold/90 font-semibold">
                  WELL WISHES / MESSAGE FOR THE COUPLE <span className="text-wedding-gold/50 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-wedding-gold/60" />
                  <textarea
                    rows={2}
                    placeholder="Write a sweet wish for the bride & groom..."
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    className="w-full bg-black/30 border border-wedding-gold/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#FAF8F5] placeholder-[#FAF8F5]/30 focus:outline-none focus:border-wedding-gold transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Error Banner */}
              {paymentError && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs text-center font-medium">
                  {paymentError}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={paymentLoading}
                className="w-full py-4 bg-wedding-emerald hover:bg-wedding-emeraldLight text-white hover:shadow-[0_0_20px_rgba(34,139,34,0.4)] transition-all duration-300 font-playfair font-bold tracking-widest text-sm rounded-xl border border-wedding-emerald/40 hover:border-wedding-gold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {paymentLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-wedding-gold" />
                    <span>PROCESSING...</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 text-wedding-goldLight" />
                    <span>SEND GIFT VIA PAYSTACK</span>
                  </>
                )}
              </button>

              <p className="text-[#FAF8F5]/50 text-[11px] text-center tracking-wider">
                🔒 Secure Paystack Checkout • Cards, Bank Transfer & USSD
              </p>
            </form>
          ) : (
            <div className="py-8 space-y-5 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-wedding-emerald/20 border-2 border-wedding-gold flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                <CheckCircle className="w-12 h-12 text-wedding-goldLight animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="font-playfair text-2xl text-wedding-gold font-bold">Gift Received & Verified!</h3>
                <p className="text-sm text-wedding-lightBeige max-w-md mx-auto leading-relaxed">
                  Thank you immensely for your financial support and warm blessings for our marriage. May your kindness be rewarded multiple folds!
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDonationSuccess(false);
                  setPaymentError('');
                  setGiftMessage('');
                }}
                className="px-8 py-3 bg-wedding-gold text-wedding-wineDark rounded-xl text-xs font-playfair font-bold tracking-widest hover:bg-wedding-goldLight transition-all border border-wedding-gold shadow-lg"
              >
                SEND ANOTHER GIFT
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 7. PHOTO GALLERY SECTION */}
      <section id="gallery" className="md:py-20 py-4 px-3 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Camera className="w-10 h-10 text-wedding-wine mx-auto mb-3" />
          <h2 className="font-playfair text-3xl text-wedding-wine tracking-wider font-bold">Wedding Photo Gallery</h2>
          <p className="text-sm text-wedding-wineDark font-medium mt-1">Capture and share your favorite moments from the wedding ceremony with us.</p>
          <div className="w-16 h-[1px] bg-wedding-gold/40 mx-auto mt-4"></div>
        </div>

        {/* Upload Form Box */}
        <div className="bg-gradient-to-br from-[#3D1B1E] to-[#250E10] text-[#FAF8F5] p-8 rounded-3xl border border-wedding-gold/30 max-w-xl mx-auto mb-16 relative shadow-2xl">
          <h3 className="font-playfair text-lg text-wedding-gold mb-4 text-center font-bold">Share a Moment</h3>
          <form onSubmit={handleUploadPhoto} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-wedding-lightBeige">Your Name</label>
                <input
                  type="text"
                  placeholder="Guest name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full bg-white border border-wedding-gold/20 rounded-xl px-3 py-2 text-xs text-wedding-wineDark font-medium focus:outline-none focus:border-wedding-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-wedding-lightBeige">Select Image (Max 10MB)</label>
                <input
                  type="file"
                  id="file-upload"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-wedding-lightBeige/80 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-wedding-gold/20 file:bg-[#240A0C] file:text-wedding-gold file:text-xs hover:file:bg-[#3B1519]"
                />
              </div>
            </div>

            {uploadMsg && (
              <p className="text-xs text-wedding-gold bg-[#240A0C] border border-[#AA7C11]/30 p-2.5 rounded-lg text-center font-medium">
                {uploadMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={uploadLoading}
              className="w-full py-3 bg-wedding-wine text-[#FAF8F5] hover:bg-wedding-wineDark transition-all duration-300 font-playfair font-bold tracking-widest text-xs rounded-xl border border-wedding-gold/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" /> {uploadLoading ? 'UPLOADING...' : 'UPLOAD PICTURE'}
            </button>
          </form>
        </div>

        {/* Gallery Grid */}
        {/* <div>
          <h3 className="font-playfair text-xl text-wedding-wine font-bold mb-6 text-center">Moments Captured</h3>
          
          {photos.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-wedding-gold/15">
              <Camera className="w-12 h-12 text-wedding-gold/30 mx-auto mb-2" />
              <p className="text-sm text-wedding-wineDark/70 italic">No approved photos in the gallery yet. Be the first to upload!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-wedding-gold/10 aspect-square bg-wedding-darkCard/40">
                  <img 
                    src={photo.imageUrl.startsWith('/uploads') ? `${BACKEND_URL}${photo.imageUrl}` : photo.imageUrl} 
                    alt="Wedding moment" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-end">
                    <span className="text-[10px] text-wedding-gold font-semibold uppercase tracking-wider block">Uploaded By:</span>
                    <span className="text-[11px] text-[#FAF8F5] font-medium">{photo.uploadedBy}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div> */}
      </section>

      {/* 8. WEDDING PROGRAMME SECTION */}
      <section id="programme" className="md:py-20 py-4 px-3 max-w-4xl mx-auto border-b border-wedding-gold/10">
        <div className="text-center mb-10">
          <Calendar className="w-10 h-10 text-wedding-wine mx-auto mb-3" />
          <h2 className="font-playfair text-3xl sm:text-4xl text-wedding-wine tracking-wider font-bold">Wedding Programme</h2>
          <p className="text-sm text-wedding-wineDark/80 italic mt-1">
            Ayodeji &amp; Adesewa — October 10, 2026 · Multi-Purpose Hall, University of Ilorin, Ilorin, Kwara
          </p>
          <div className="w-16 h-[1px] bg-wedding-gold/40 mx-auto mt-4"></div>
        </div>

        <div className="relative">
          {/* Decorative corner accents */}
          <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-wedding-gold/40 rounded-tl-lg z-10" />
          <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-wedding-gold/40 rounded-tr-lg z-10" />
          <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-wedding-gold/40 rounded-bl-lg z-10" />
          <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-wedding-gold/40 rounded-br-lg z-10" />

          <img
            src="/wedding_programme.png"
            alt="AALOVESTORY2026 Wedding Programme"
            className="w-full rounded-2xl border border-wedding-gold/20 shadow-2xl object-contain"
            loading="lazy"
          />
        </div>
      </section>

      {/* Decorative footer */}
      <footer className="md:py-20 py-12 border-t border-wedding-gold/20 text-center bg-[#1F0A0D] text-[#FAF8F5]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-playfair text-2xl text-gold-gradient tracking-widest font-bold">AALOVESTORY2026</h2>
          <p className="text-xs text-[#FAF8F5]/70 font-poppins mt-2 tracking-wider">Ayodeji &amp; Adesewa — Forever &amp; Always</p>

          {/* Builder Credit & Advert Section */}
          <div className="mt-10 mb-10 p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-[#2D1216] via-[#38161B] to-[#250E11] border-2 border-wedding-gold/40 shadow-[0_15px_40px_rgba(0,0,0,0.5)] relative overflow-hidden max-w-2xl mx-auto">
            {/* Subtle decorative gold line glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-wedding-gold to-transparent opacity-80" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-wedding-gold to-transparent opacity-80" />

            <span className="inline-block text-[11px] font-playfair font-semibold uppercase tracking-[0.25em] text-wedding-gold bg-wedding-gold/10 px-4 py-1.5 rounded-full border border-wedding-gold/30 mb-4">
              Website Designed &amp; Built By
            </span>

            <h3 className="font-playfair text-2xl sm:text-3xl font-extrabold text-wedding-gold tracking-wide mb-2">
              Veleon Solution
            </h3>

            <p className="text-xs sm:text-sm text-[#FAF8F5]/85 font-poppins max-w-md mx-auto mb-6 leading-relaxed">
              Need a custom wedding website, digital invitation, or premium web app for your special event or business?
            </p>

            <a
              href="https://wa.me/2348105281572?text=Hello%20Veleon%20Solution,%20I%20saw%20the%20AALOVESTORY2026%20wedding%20website%20and%20I'd%20like%20to%20make%20an%20enquiry."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-base sm:text-lg rounded-2xl shadow-[0_6px_25px_rgba(37,211,102,0.4)] hover:shadow-[0_8px_30px_rgba(37,211,102,0.6)] transition-all duration-300 transform hover:-translate-y-0.5 border border-white/20 active:scale-95 group cursor-pointer"
            >
              <svg className="w-6 h-6 fill-current text-white transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24">
                <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.94 9.94 0 001.353 5.033L2 22l5.129-1.34A9.949 9.949 0 0012.01 22c5.506 0 9.989-4.478 9.989-9.984 0-5.507-4.483-9.984-9.987-9.984zm5.795 14.129c-.244.688-1.423 1.314-1.96 1.365-.502.047-1.144.208-3.774-.881-3.238-1.34-5.309-4.646-5.472-4.863-.16-.217-1.314-1.751-1.314-3.34 0-1.589.836-2.37 1.134-2.695.297-.326.65-.407.868-.407.217 0 .434.002.624.011.202.01.472-.077.738.56.271.65.922 2.254 1.003 2.417.081.163.136.353.027.57-.109.217-.163.353-.326.543-.163.19-.342.424-.488.57-.163.163-.334.34-.144.666.19.326.842 1.39 1.808 2.25 1.242 1.106 2.292 1.45 2.618 1.613.326.163.516.136.706-.081.19-.217.814-.949 1.031-1.275.217-.326.434-.271.733-.163.299.109 1.899.896 2.225 1.059.326.163.543.244.624.38.081.136.081.787-.163 1.475z"/>
              </svg>
              <span>Make Enquiries on WhatsApp</span>
            </a>

            <div className="mt-4 text-xs text-wedding-gold/90 font-medium tracking-wider">
              Direct Contact: <a href="tel:08105281572" className="underline hover:text-white transition-colors">08105281572</a>
            </div>
          </div>

          <p className="text-[12px] font-poppins tracking-[0.2em] uppercase text-wedding-gold/80 font-bold">
            © 2026 AALOVESTORY. All Rights Reserved.
          </p>
        </div>
      </footer>

      {/* Sticky Seating Banner */}
      {invite && invite.rsvpSubmitted && !seatBannerDismissed && (
        <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto md:w-full md:max-w-4xl z-50 bg-[#722F37] border border-[#D4AF37]/50 p-4 sm:p-5 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.6)] flex flex-col md:flex-row items-center justify-between gap-4 animate-slide-up text-[#FAF8F5] select-none">
          {/* Close button */}
          <button
            onClick={() => setSeatBannerDismissed(true)}
            aria-label="Close seating banner"
            className="absolute top-2.5 right-2.5 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 border border-[#D4AF37]/20 text-[#D4AF37]/70 hover:text-white transition-all duration-200 text-xs cursor-pointer"
          >
            ✕
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-[#D4AF37]/30 text-lg">
              🪑
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-[0.2em] text-[#D4AF37] font-bold">Seat Status</h4>
              <p className="text-[11px] opacity-80 mt-0.5">
                {invite.seatingPublished ? 'Your seating arrangement has been finalized.' : 'Seating assignments will be released soon.'}
              </p>
            </div>
          </div>

          <div className="bg-black/30 border border-[#D4AF37]/20 px-5 py-2.5 rounded-xl text-center md:text-right shrink-0 min-w-[200px]">
            {invite.seatingPublished ? (
              (() => {
                const attendees = invite.rsvp?.attendees || rsvpData?.attendees || [];
                const tableNames = [...new Set(attendees.filter(a => a.table).map(a => a.table.name))];
                const seatNumbers = attendees.filter(a => a.seatNumber).map(a => a.seatNumber);

                if (tableNames.length > 0) {
                  return (
                    <div>
                      <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider block font-semibold">Assigned Location</span>
                      <span className="text-base font-bold font-playfair tracking-wide text-white">
                        {tableNames.join(' & ')}
                      </span>
                      {seatNumbers.length > 0 && (
                        <span className="text-[10px] text-wedding-lightBeige/90 font-mono block mt-0.5">
                          {seatNumbers.length === 1 ? `Seat ${seatNumbers[0]}` : `Seats ${seatNumbers.join(', ')}`}
                        </span>
                      )}
                    </div>
                  );
                } else {
                  return (
                    <div>
                      <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider block font-semibold">Assigned Location</span>
                      <span className="text-sm font-semibold italic text-wedding-lightBeige/70">
                        Table not assigned yet
                      </span>
                    </div>
                  );
                }
              })()
            ) : (
              <p className="text-xs font-semibold text-wedding-lightBeige text-center leading-relaxed">
                Your seat number will be available one week before the wedding. Please revisit this link to view your table.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Floating Sticky Scroll Arrow */}
      <AnimatePresence>
        {showScrollArrow && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            onClick={() => window.scrollBy({ top: window.innerHeight * 0.75, behavior: 'smooth' })}
            className={`fixed ${invite && invite.rsvpSubmitted && !seatBannerDismissed ? 'bottom-24' : 'bottom-6'} left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1 cursor-pointer group select-none`}
            aria-label="Scroll Down"
          >
            <div className="bg-[#2A0C10]/95 hover:bg-[#3D1B1E] border border-wedding-gold/70 shadow-[0_6px_25px_rgba(0,0,0,0.6)] backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 group-hover:border-wedding-gold group-hover:scale-105">
              <span className="text-[11px] font-playfair font-bold text-wedding-gold tracking-[0.2em] uppercase">Scroll</span>
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ChevronDown className="w-4 h-4 text-wedding-gold" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>





    </div>
  );
}
