import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Search, 
  Calendar, 
  Users, 
  Star, 
  MapPin, 
  Clock, 
  Shield, 
  Trophy,
  ArrowRight,
  CheckCircle,
  Heart,
  Building,
  Zap,
  Award,
  Globe,
  TrendingUp,
  Menu,
  X
} from "lucide-react";
import Navbar from "@/components/ui/navbar";
import SiteLogo from "@/components/ui/site-logo";

export default function Landing() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNavbarVisible, setIsNavbarVisible] = useState(true);
  const [isNavbarCompact, setIsNavbarCompact] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  const rotatingTexts = ["LOCAL", "FUN", "AMAZING", "VIBRANT", "ACTIVE", "BEST"];

  // Text rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % rotatingTexts.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [rotatingTexts.length]);

  // Navbar scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show full navbar when at top of page
      if (currentScrollY === 0) {
        setIsNavbarVisible(true);
        setIsNavbarCompact(false);
      }
      // Compact mode when scrolling up, full mode when scrolling down
      else if (currentScrollY > lastScrollY) {
        // Scrolling down - show compact navbar
        setIsNavbarVisible(true);
        setIsNavbarCompact(true);
      } else {
        // Scrolling up - show full navbar
        setIsNavbarVisible(true);
        setIsNavbarCompact(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  const features = [
    {
      icon: <Search className="h-8 w-8" />,
      title: "Smart Discovery",
      description: "Find the perfect sports facility with advanced filters by sport type, price, location, and ratings"
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Real-time Booking",
      description: "Book courts instantly with live availability, flexible time slots, and instant confirmations"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Community Matches",
      description: "Create or join matches with players in your area. Build your local sports community"
    },
    {
      icon: <Building className="h-8 w-8" />,
      title: "Facility Management",
      description: "Complete dashboard for facility owners to manage courts, bookings, and track earnings"
    }
  ];

  const userRoles = [
    {
      icon: <Users className="h-12 w-12" />,
      title: "Sports Enthusiasts",
      description: "Book courts, join matches, connect with players",
      features: ["Quick booking", "Match joining", "Player profiles", "Booking history"]
    },
    {
      icon: <Building className="h-12 w-12" />,
      title: "Facility Owners",
      description: "Manage facilities, track bookings, grow revenue",
      features: ["Court management", "Booking analytics", "Revenue tracking", "Customer insights"]
    }
  ];

  const sports = [
    { name: "Badminton", count: "500+ Courts", icon: "🏸", popular: true },
    { name: "Tennis", count: "300+ Courts", icon: "🎾", popular: true },
    { name: "Basketball", count: "200+ Courts", icon: "🏀", popular: false },
    { name: "Football", count: "150+ Fields", icon: "⚽", popular: true },
    { name: "Table Tennis", count: "400+ Tables", icon: "🏓", popular: false },
    { name: "Squash", count: "100+ Courts", icon: "🥌", popular: false }
  ];

  const benefits = [
    // { text: "Zero membership fees", icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
    { text: "Instant booking confirmation", icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
    { text: "24/7 customer support", icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
    // { text: "Flexible cancellation policy", icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
    { text: "Community match making", icon: <CheckCircle className="h-5 w-5 text-green-500" /> },
    { text: "Secure payment processing", icon: <CheckCircle className="h-5 w-5 text-green-500" /> }
  ];

  const stats = [
    { value: "50,000+", label: "Active Players", icon: <Users className="h-6 w-6" /> },
    { value: "1,500+", label: "Sport Venues", icon: <Building className="h-6 w-6" /> },
    { value: "100+", label: "Cities Covered", icon: <Globe className="h-6 w-6" /> },
    { value: "4.8★", label: "User Rating", icon: <Star className="h-6 w-6" /> }
  ];

  const testimonials = [
    {
      name: "Rajesh Kumar",
      role: "Badminton Enthusiast",
      image: "👨‍💼",
      text: "Found amazing courts near my office. The community feature helped me find regular playing partners!"
    },
    {
      name: "Sports Club Manager",
      role: "Facility Owner",
      image: "👩‍💼",
      text: "Increased our bookings by 300% since joining QuickCourt. The management dashboard is incredibly helpful."
    },
    {
      name: "Priya Sharma",
      role: "Tennis Player",
      image: "👩‍🦳",
      text: "Love how easy it is to book courts and join tournaments. The app is so user-friendly!"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Unified Navbar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>

      {/* Enhanced Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-primary/5 via-white to-secondary/5 relative overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <Badge className="mb-6 bg-gradient-to-r from-primary to-secondary text-white border-0 px-4 py-2 inline-flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                INDIA'S #1 SPORTS BOOKING PLATFORM
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                YOUR{" "}
                <span className="inline-block relative align-baseline" style={{ height: '1em', width: 'auto', minWidth: '350px' }}>
                  {rotatingTexts.map((text, index) => (
                    <span 
                      key={index}
                      className={`absolute top-0 left-0 w-full h-full flex items-center justify-start transition-all duration-500 ease-in-out bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent ${
                        index === currentTextIndex ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
                      }`}
                    >
                      {text}
                    </span>
                  ))}
                </span>{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  SPORTS FACILITY
                </span>
                <br />
                <span className="text-2xl sm:text-3xl lg:text-4xl font-normal text-gray-600">
                  Awaits You
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-lg leading-relaxed mx-auto lg:mx-0">
                Discover, book, and play at premium sports facilities. Connect with fellow enthusiasts and build your local sports community.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-10 justify-center lg:justify-start">
                <Link href="/facilities">
                  <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:shadow-lg transition-all">
                    <Calendar className="mr-2 h-4 sm:h-5 w-4 sm:w-5" />
                    Book Now
                    <ArrowRight className="ml-2 h-4 sm:h-5 w-4 sm:w-5" />
                  </Button>
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-8 text-sm">
                <div className="flex items-center text-gray-600">
                  <Heart className="h-4 w-4 text-red-500 mr-2" />
                  <span className="font-medium">50K+ Happy Players</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Star className="h-4 w-4 text-yellow-500 mr-2" />
                  <span className="font-medium">4.8/5 Rating</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Award className="h-4 w-4 text-primary mr-2" />
                  <span className="font-medium">Award Winning</span>
                </div>
              </div>
            </div>
            
            <div className="relative mt-8 lg:mt-0">
              <div className="relative z-10 transform hover:scale-105 transition-transform duration-300">
                <img 
                  src="https://i.pinimg.com/1200x/04/82/6d/04826dce193bf7644357aed28652d7a3.jpg" 
                  alt="Sports Community at QuickCourt" 
                  className="rounded-3xl shadow-2xl w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-3xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Stats Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Trusted by Sports Community</h2>
            <p className="text-base sm:text-lg text-gray-600">Join thousands of players and facility owners across India</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center bg-white p-4 sm:p-6 rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-primary/10 rounded-xl text-primary mb-3 sm:mb-4">
                  {stat.icon}
                </div>
                <div className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">{stat.value}</div>
                <div className="text-sm sm:text-base text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Roles Section */}
      <section id="roles" className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Built for Everyone</h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Whether you're a player or facility owner, QuickCourt has everything you need
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-8">
            {userRoles.map((role, index) => (
              <Card key={index} className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50">
                <CardContent className="p-6 sm:p-8">
                  <div className="inline-flex items-center justify-center w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-r from-primary to-secondary rounded-2xl text-white mb-6 group-hover:scale-110 transition-transform">
                    {role.icon}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">{role.title}</h3>
                  <p className="text-gray-600 mb-6">{role.description}</p>
                  <ul className="space-y-2">
                    {role.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm text-gray-700">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section id="features" className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              POWERFUL FEATURES
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need in One Platform
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Experience seamless sports facility booking with our comprehensive feature set
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group text-center p-4 sm:p-6 hover:shadow-xl transition-all duration-300 border-0 bg-white hover:-translate-y-2 cursor-pointer"
                onMouseEnter={() => setActiveFeature(index)}
              >
                <CardContent className="pt-4 sm:pt-6">
                  <div className={`inline-flex items-center justify-center w-16 sm:w-20 h-16 sm:h-20 rounded-2xl mb-4 sm:mb-6 transition-all duration-300 ${
                    activeFeature === index 
                      ? 'bg-gradient-to-r from-primary to-secondary text-white scale-110' 
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Sports Section */}
      <section id="sports" className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Multiple Sports, One Platform
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Access premium facilities across your favorite sports
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sports.map((sport, index) => (
              <Card key={index} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-white to-gray-50 relative overflow-hidden">
                {sport.popular && (
                  <Badge className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-gradient-to-r from-primary to-secondary text-white border-0 text-xs sm:text-sm">
                    Popular
                  </Badge>
                )}
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="text-3xl sm:text-5xl">{sport.icon}</div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">{sport.name}</h3>
                      <p className="text-sm sm:text-base text-gray-600 font-medium">{sport.count}</p>
                      <div className="flex items-center mt-1 sm:mt-2">
                        <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 mr-1" />
                        <span className="text-xs sm:text-sm text-gray-500">Available nationwide</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
            <p className="text-lg sm:text-xl text-gray-600">Join thousands of satisfied sports enthusiasts</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 bg-white hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <div className="text-2xl sm:text-3xl mr-3">{testimonial.image}</div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">{testimonial.name}</div>
                      <div className="text-xs sm:text-sm text-gray-500">{testimonial.role}</div>
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-gray-600 italic">"{testimonial.text}"</p>
                  <div className="flex mt-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Benefits Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
                WHY CHOOSE US
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Your Sports Journey Simplified
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-8">
                Experience hassle-free sports facility booking with benefits designed for the modern sports enthusiast.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-8">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2">
                    {benefit.icon}
                    <span className="text-sm sm:text-base text-gray-700 font-medium">{benefit.text}</span>
                  </div>
                ))}
              </div>
              {/* <div className="bg-gradient-to-r from-primary to-secondary text-white p-6 sm:p-8 rounded-3xl relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative">
                  <div className="text-xs sm:text-sm font-medium mb-2 opacity-90">LIMITED TIME OFFER</div>
                  <div className="text-2xl sm:text-3xl font-bold mb-2">UP TO ₹200 OFF</div>
                  <div className="text-xs sm:text-sm opacity-90">on your first 5 bookings + Free premium features</div>
                </div>
              </div> */}
            </div>
            
            <div className="relative mt-8 lg:mt-0">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <img 
                  src="https://images.unsplash.com/photo-1552196563-55cd4e45efb3?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" 
                  alt="Badminton Court" 
                  className="rounded-2xl shadow-lg col-span-1 w-full h-auto"
                />
                <img 
                  src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" 
                  alt="Tennis Court" 
                  className="rounded-2xl shadow-lg col-span-1 mt-4 sm:mt-8 w-full h-auto"
                />
                {/* <img 
                  src="https://images.unsplash.com/photo-1546519638-68e109498ffc?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" 
                  alt="Basketball Court" 
                  className="rounded-2xl shadow-lg col-span-2 w-full h-auto"
                /> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 mb-8 sm:mb-12">
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <SiteLogo variant="footer" />
              </div>
              <p className="text-gray-400 mb-6 leading-relaxed text-sm sm:text-base">
                India's leading sports facility booking platform. Connect with your local sports community, book premium facilities, and elevate your game.
              </p>
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                  </svg>
                </Button>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.219.085.338-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                  </svg>
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6">Platform</h3>
              <ul className="space-y-2 sm:space-y-3 text-gray-400 text-sm sm:text-base">
                <li><Link href="/facilities" className="hover:text-white transition-colors">Find Venues</Link></li>
                <li><Link href="/matches" className="hover:text-white transition-colors">Join Matches</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">List Your Venue</a></li>
                <li><Link href="/signup" className="hover:text-white transition-colors">Create Account</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6">Sports</h3>
              <ul className="space-y-2 sm:space-y-3 text-gray-400 text-sm sm:text-base">
                <li><a href="#" className="hover:text-white transition-colors">Badminton Courts</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Tennis Courts</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Basketball Courts</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Football Fields</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6">Support</h3>
              <ul className="space-y-2 sm:space-y-3 text-gray-400 text-sm sm:text-base">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-6 sm:pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-gray-400 text-sm sm:text-base text-center md:text-left">
                &copy; 2025 QuickCourt. All rights reserved. Made with ❤️ for sports enthusiasts across India.
              </p>
              <div className="flex items-center space-x-4 sm:space-x-6 text-xs sm:text-sm text-gray-400">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-white transition-colors">Cookies</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
