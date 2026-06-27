import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { motion } from 'framer-motion';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { 
  Heart, Calendar, Clock, MapPin, Shirt, Gift, 
  Camera, Upload, Download, CheckCircle, ChevronRight, Info 
} from 'lucide-react';

export default function MainPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // RSVP success state
  const [rsvpSuccess, setRsvpSuccess] = useState(false);
  const [rsvpData, setRsvpData] = useState(null);
  
  // Donation states
  const [donationAmount, setDonationAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(false);

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
  const couplePhotos = ['/img1.jpg', '/img2.jpg', '/img3.jpg'];

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // React Hook Form for RSVP
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      attendees: [{ fullName: '', phoneNumber: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'attendees'
  });

  const attendeeCount = watch('attendees')?.length || 1;

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
        attendees: data.attendees
      });
      setRsvpData(res.data);
      setRsvpSuccess(true);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error('RSVP submission error:', err);
      alert(err.response?.data?.error || 'Failed to submit RSVP.');
    }
  };

  // Support Wedding - Paystack
  const handleSupportPayment = async () => {
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
    setPaymentLoading(true);

    try {
      const response = await axios.post(`${API_URL}/paystack/initialize`, {
        amount: parseFloat(donationAmount),
        donorName: donorName || 'Generous Guest',
        anonymous: isAnonymous
      });

      if (response.data.authorization_url) {
        if (response.data.isMock) {
          // If it is sandbox mock flow, open in a window or direct checkout
          window.location.href = response.data.authorization_url;
        } else {
          // Redirect to Paystack secure payment page
          window.location.href = response.data.authorization_url;
        }
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      alert('Failed to initialize payment gateway.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Handle Local Check for Paystack redirect returns
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
          if (res.data.donation) {
            setDonationSuccess(true);
            confetti({
              particleCount: 100,
              spread: 60,
              colors: ['#F5F5DC', '#D4AF37', '#722F37']
            });
            // Clean URL query parameters
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
    setUploadLoading(true);
    setUploadMsg('');

    const formData = new FormData();
    formData.append('photo', selectedFile);
    formData.append('uploadedBy', guestName);

    try {
      const res = await axios.post(`${API_URL}/gallery/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadMsg(res.data.message);
      setSelectedFile(null);
      setGuestName('');
      // Reset file input
      document.getElementById('file-upload').value = '';
    } catch (err) {
      console.error('Upload photo error:', err);
      setUploadMsg('Failed to upload photo. Only image files under 10MB are accepted.');
    } finally {
      setUploadLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!rsvpData?.qrCode) return;
    const link = document.createElement('a');
    link.href = rsvpData.qrCode;
    link.download = `AALOVESTORY2026-RSVP-${rsvpData.serialNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            October 10, 2026 | Lagos, Nigeria
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
      <section className="w-full overflow-hidden" aria-label="Couple Photos Carousel">
        <div className="relative w-full" style={{ height: 'clamp(350px, 55vw, 560px)' }}>
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
                className="w-full h-full object-cover object-center"
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
      <section className="py-20 px-6 max-w-4xl mx-auto border-b border-wedding-gold/10">
        <div className="text-center mb-16">
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
              We met on the university campus library steps. What started as sharing lecture notes quickly blossomed into endless chats, late-night campus coffee runs, and a deep, unbreakable friendship.
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
              After two years of supporting each other's dreams, sharing goals, and walking side by side as best friends, we realized that our hearts were irrevocably bound together. Friendship matured into a beautiful romance.
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
              Under a canopy of stars on an evening beach getaway, Ayodeji knelt down and asked Adesewa to spend forever with him. It was an easy, tearful "Yes!".
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
      <section className="py-20 px-6 max-w-5xl mx-auto border-b border-wedding-gold/10">
        <div className="text-center mb-16">
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
            <p className="text-sm text-wedding-lightBeige font-medium">Grand Imperial Hall</p>
            <p className="text-xs text-[#FAF8F5]/80 mt-1">Victoria Island, Lagos, Nigeria</p>
          </div>

          {/* Card 3: Dress Code */}
          <div className="bg-wedding-wine text-white p-8 rounded-2xl border border-wedding-gold/30 text-center flex flex-col items-center shadow-xl">
            <Shirt className="w-8 h-8 text-wedding-gold mb-4 animate-pulse" />
            <h3 className="font-playfair text-lg text-wedding-gold font-bold mb-2">Dress Code</h3>
            <p className="text-sm text-wedding-lightBeige font-medium">Luxury African Glamour</p>
            <p className="text-xs text-[#FAF8F5]/80 mt-1">Colors: Emerald Green, Wine Red & Gold</p>
          </div>
        </div>

        {/* Map Embed & Dress Code Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          <div className="bg-white p-6 rounded-2xl border-2 border-wedding-wine/10 overflow-hidden h-[300px] shadow-lg">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15858.07727192663!2d3.4093655767733475!3d6.428779646879803!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103bf53280e895c7%3A0xc0c4d29f8c6e26cf!2sVictoria+Island%2C+Lagos!5e0!3m2!1sen!2sng!4v1700000000000!5m2!1sen!2sng"
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
              To celebrate our heritage and color harmony, we invite our guests to wear our selected colors: **Emerald Green** or **Wine Red** styled with beautiful **Gold** accents.
            </p>
            <p className="text-sm text-wedding-lightBeige/90 leading-relaxed font-semibold">
              For info regarding fabric purchases and tailors, please connect with the Aso Ebi Coordinator: **080-Wedding-Aso-Ebi**.
            </p>
          </div>
        </div>
      </section>

      {/* 4. COLOR THEME PALETTE */}
      <section className="py-20 px-6 max-w-4xl mx-auto border-b border-wedding-gold/10">
        <div className="text-center mb-12">
          <h2 className="font-playfair text-2xl sm:text-3xl text-wedding-wine font-bold tracking-wider">Wedding Color Palette</h2>
          <div className="w-16 h-[1px] bg-wedding-gold/40 mx-auto mt-3"></div>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {/* Color Card: Wine */}
          <div className="w-24 sm:w-32 text-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-wedding-wine border border-wedding-gold/30 shadow-lg mx-auto mb-3"></div>
            <span className="font-playfair text-sm text-wedding-wineDark font-bold">Wine Red</span>
          </div>

          {/* Color Card: Beige */}
          <div className="w-24 sm:w-32 text-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-wedding-lightBeige border border-wedding-gold/30 shadow-lg mx-auto mb-3"></div>
            <span className="font-playfair text-sm text-wedding-wineDark font-bold">Luxury Beige</span>
          </div>

          {/* Color Card: Emerald */}
          <div className="w-24 sm:w-32 text-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-wedding-emerald border border-wedding-gold/30 shadow-lg mx-auto mb-3"></div>
            <span className="font-playfair text-sm text-wedding-wineDark font-bold">Emerald Green</span>
          </div>

          {/* Color Card: Gold */}
          <div className="w-24 sm:w-32 text-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-wedding-gold border border-wedding-gold/30 shadow-lg mx-auto mb-3"></div>
            <span className="font-playfair text-sm text-wedding-wineDark font-bold">Royal Gold</span>
          </div>
        </div>
      </section>

      {/* 5. RSVP SECTION */}
      <section id="rsvp" className="py-20 px-6 max-w-2xl mx-auto border-b border-wedding-gold/10 scroll-mt-20">
        <div className="text-center mb-12">
          <Heart className="w-10 h-10 text-wedding-wine mx-auto mb-3" />
          <h2 className="font-playfair text-3xl text-wedding-wine tracking-wider font-bold">RSVP</h2>
          <p className="text-sm text-wedding-wineDark font-medium mt-1">Please confirm your attendance by submitting the RSVP below.</p>
          <div className="w-16 h-[1px] bg-wedding-gold/40 mx-auto mt-4"></div>
        </div>

        {/* RSVP FORM OR SUCCESS SCREEN */}
        <div className="bg-gradient-to-br from-[#3D1B1E] to-[#250E10] text-[#FAF8F5] p-8 rounded-3xl border border-wedding-gold/30 relative overflow-hidden shadow-2xl">
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
            <div className="text-center space-y-6 py-4 flex flex-col items-center">
              <CheckCircle className="w-16 h-16 text-wedding-goldLight animate-bounce" />
              <div>
                <h3 className="font-playfair text-2xl text-wedding-gold">RSVP Confirmed!</h3>
                <p className="text-sm text-wedding-lightBeige mt-1">Thank you for confirming your attendance, {invite?.familyName} Family.</p>
              </div>

              {/* Serial number box */}
              <div className="bg-[#240A0C] border border-wedding-gold/30 px-6 py-4 rounded-2xl inline-block shadow-md">
                <span className="text-xs text-wedding-goldLight/80 uppercase tracking-widest font-bold block">Entry Serial Number</span>
                <span className="text-xl sm:text-2xl font-mono text-wedding-gold font-bold tracking-wider mt-1 block">
                  {rsvpData?.serialNumber || 'AAL-XXXXXX'}
                </span>
              </div>

              {/* QR Code Container */}
              {rsvpData?.qrCode && (
                <div className="bg-white p-3 rounded-2xl inline-block border-2 border-wedding-gold/40 shadow-xl">
                  <img src={rsvpData.qrCode} alt="Entry QR Code" className="w-40 h-40" />
                </div>
              )}

              <div className="max-w-md bg-[#240A0C]/50 border border-wedding-gold/15 p-4 rounded-xl text-left">
                <p className="text-[11px] text-wedding-gold font-bold uppercase tracking-wider mb-2">Important Instructions:</p>
                <ul className="text-[11px] text-wedding-lightBeige/90 space-y-1.5 list-disc pl-4">
                  <li>Please **save or download this QR Code** to your device.</li>
                  <li>Present this serial number or QR code to the check-in bouncers at the wedding venue entrance.</li>
                  <li>The QR code authorizes entry for exactly **{rsvpData?.attendanceCount || invite?.maxGuests} guests**.</li>
                </ul>
              </div>

              {/* Download CTA */}
              {rsvpData?.qrCode && (
                <button
                  onClick={downloadQRCode}
                  className="px-6 py-2.5 bg-wedding-gold text-wedding-wineDark hover:bg-wedding-goldLight transition-all duration-300 font-playfair font-bold text-xs tracking-wider rounded-lg border border-wedding-goldLight/20 flex items-center justify-center gap-2 hover:shadow-lg"
                >
                  <Download className="w-4 h-4" /> DOWNLOAD QR CODE
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 6. DONATION/SUPPORT SYSTEM */}
      <section id="support" className="py-20 px-6 max-w-2xl mx-auto border-b border-wedding-gold/10 scroll-mt-20">
        <div className="text-center mb-12">
          <Gift className="w-10 h-10 text-wedding-wine mx-auto mb-3" />
          <h2 className="font-playfair text-3xl text-wedding-wine tracking-wider font-bold">Support Our Wedding</h2>
          <p className="text-sm text-wedding-wineDark font-medium mt-1">If you wish to honor us with a financial gift, you can use the secure Paystack checkout below.</p>
          <div className="w-16 h-[1px] bg-wedding-gold/40 mx-auto mt-4"></div>
        </div>

        <div className="bg-gradient-to-br from-[#3D1B1E] to-[#250E10] text-[#FAF8F5] p-8 rounded-3xl border border-wedding-gold/30 text-center relative overflow-hidden shadow-2xl">
          {/* Gold Decorative Corner Lines */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t border-l border-wedding-gold/20"></div>
          <div className="absolute top-2 right-2 w-6 h-6 border-t border-r border-wedding-gold/20"></div>
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b border-l border-wedding-gold/20"></div>
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b border-r border-wedding-gold/20"></div>

          {!donationSuccess ? (
            <div className="space-y-6">
              {/* Preset Amounts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[5000, 10000, 25000, 50000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setDonationAmount(preset.toString())}
                    className={`py-3 rounded-xl font-playfair border text-xs tracking-wider transition-all duration-200 ${
                      donationAmount === preset.toString()
                        ? 'bg-wedding-gold border-wedding-gold text-wedding-wineDark font-bold'
                        : 'bg-[#240A0C]/50 border-wedding-gold/20 text-[#FAF8F5]/90 hover:border-wedding-gold/50'
                    }`}
                  >
                    ₦{preset.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="space-y-2 text-left">
                <label className="block text-sm font-medium text-wedding-lightBeige">Or enter a custom amount (NGN)</label>
                <input
                  type="number"
                  placeholder="Enter custom amount ₦"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  className="w-full bg-white border border-wedding-gold/30 rounded-xl px-4 py-3 text-wedding-wineDark font-medium focus:outline-none focus:border-wedding-gold"
                />
              </div>

              {/* Name Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-wedding-lightBeige">Your Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={donorName}
                    disabled={isAnonymous}
                    onChange={(e) => setDonorName(e.target.value)}
                    className="w-full bg-white border border-wedding-gold/20 rounded-xl px-3 py-2.5 text-sm text-wedding-wineDark font-medium focus:outline-none focus:border-wedding-gold disabled:opacity-40"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6 sm:pt-8 pl-1">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="rounded border-wedding-gold/30 bg-[#240A0C] text-wedding-wine focus:ring-0 focus:ring-offset-0 w-5 h-5"
                  />
                  <label htmlFor="anonymous" className="text-sm text-wedding-lightBeige/85 cursor-pointer select-none">Send Anonymously</label>
                </div>
              </div>

              {/* Support Submit */}
              <button
                onClick={handleSupportPayment}
                disabled={paymentLoading}
                className="w-full py-4 bg-wedding-emerald hover:bg-wedding-emeraldLight text-white hover:shadow-lg transition-all duration-300 font-playfair font-bold tracking-widest text-sm rounded-xl border border-wedding-emerald/40 hover:border-wedding-gold flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                {paymentLoading ? 'PROCEEDING TO CHECKOUT...' : 'SUPPORT WITH PAYSTACK'}
              </button>
            </div>
          ) : (
            <div className="py-6 space-y-4 flex flex-col items-center">
              <CheckCircle className="w-16 h-16 text-wedding-goldLight animate-bounce" />
              <div>
                <h3 className="font-playfair text-2xl text-wedding-gold">Payment Verified!</h3>
                <p className="text-sm text-wedding-lightBeige mt-1">Thank you immensely for your kind financial support. May your pockets be replenished in multiple folds.</p>
              </div>
              <button
                onClick={() => setDonationSuccess(false)}
                className="px-6 py-2 bg-wedding-gold text-wedding-wineDark rounded-xl text-xs font-playfair tracking-wider hover:bg-wedding-goldLight transition-all"
              >
                SUPPORT AGAIN
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 7. PHOTO GALLERY SECTION */}
      <section id="gallery" className="py-20 px-6 max-w-5xl mx-auto">
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
        <div>
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
        </div>
      </section>

      {/* Decorative footer */}
      <footer className="py-12 border-t border-wedding-gold/10 text-center bg-wedding-darkCard/40">
        <h2 className="font-playfair text-xl text-gold-gradient tracking-widest">AALOVESTORY2026</h2>
        <p className="text-xs text-wedding-beige/60 font-poppins mt-2 tracking-wider">Ayodeji & Adesewa — Forever & Always</p>
        <p className="text-[9px] text-wedding-gold/30 font-poppins tracking-[0.2em] mt-8 uppercase">© 2026 AALOVESTORY. All Rights Reserved.</p>
      </footer>
    </div>
  );
}
