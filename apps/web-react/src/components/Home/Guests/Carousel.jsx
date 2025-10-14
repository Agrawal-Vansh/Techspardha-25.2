import React, { useState, useEffect, useCallback, useRef, useMemo, forwardRef } from "react";
import axios from "axios"; 
import ProfileCard from "./ProfileCard";

// Debounce function for resizing
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

const Carousel = forwardRef(
  ({ autoSlide = true, interval = 4000, cardWidth = 440, ...props }, ref) => {
    // State for lectures data
    const [lectures, setLectures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch lectures data from API
    useEffect(() => {
      const fetchLectures = async () => {
        try {
          setLoading(true);
          const response = await axios.get('https://us-central1-techspardha-87928.cloudfunctions.net/api2/lectures');
          if (response.data.success) {
            setLectures(response.data.data.lectures);
          } else {
            setError('Failed to fetch lectures data');
          }
        } catch (err) {
          setError('Error fetching lectures: ' + err.message);
          console.error('Error fetching lectures:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchLectures();
    }, []);

    // State for the post-loading slide-in animation
    const [show, setShow] = useState(false);

    // States for carousel functionality
    const [paused, setPaused] = useState(false);
    const [visibleCount, setVisibleCount] = useState(3);
    const carouselRef = useRef(null);
    
    // Create looped items for infinite scroll effect
    const loopedItems = useMemo(() => {
      if (lectures && lectures.length > 0 && lectures.length > visibleCount) {
        const startClones = lectures.slice(lectures.length - visibleCount);
        const endClones = lectures.slice(0, visibleCount);
        return [...startClones, ...lectures, ...endClones];
      }
      return lectures || [];
    }, [lectures, visibleCount]);

    // State for the current slide index and managing transitions for the loop
    const [current, setCurrent] = useState(visibleCount);
    const [isTransitioning, setIsTransitioning] = useState(true);

    // Effect to handle the post-loading animation
    useEffect(() => {
      if (loading) return; // Do nothing if still loading
      const timer = setTimeout(() => {
        setShow(true);
      }, 100); // Small delay to trigger the transition
      return () => clearTimeout(timer);
    }, [loading]);

    // Effect to calculate how many cards are visible on resize
    useEffect(() => {
      const updateVisibleCount = () => {
        if (carouselRef.current) {
          const containerWidth = carouselRef.current.offsetWidth;
          const newVisibleCount = Math.floor(containerWidth / cardWidth);
          const newCount = Math.max(1, newVisibleCount);
          setVisibleCount(newCount);
          setCurrent(newCount); // Reset position on resize for stability
        }
      };
      const debouncedUpdate = debounce(updateVisibleCount, 250);
      updateVisibleCount();
      window.addEventListener("resize", debouncedUpdate);
      return () => window.removeEventListener("resize", debouncedUpdate);
    }, [cardWidth]);

    // Navigation functions
    const nextSlide = useCallback(() => {
      if (!isTransitioning) return;
      setCurrent((prev) => prev + 1);
    }, [isTransitioning]);

    const prevSlide = useCallback(() => {
      if (!isTransitioning) return;
      setCurrent((prev) => prev - 1);
    }, [isTransitioning]);

    // Handler for the "magic jump" after a transition to a cloned slide ends
    const handleTransitionEnd = () => {
      if (lectures && lectures.length > 0) {
          if (current >= lectures.length + visibleCount) {
              setIsTransitioning(false);
              setCurrent(visibleCount);
          }
          if (current <= visibleCount - 1) {
              setIsTransitioning(false);
              setCurrent(lectures.length + visibleCount - 1);
          }
      }
    };

    // Re-enable transitions after a "magic jump"
    useEffect(() => {
      if (!isTransitioning) {
        const timer = setTimeout(() => setIsTransitioning(true), 50);
        return () => clearTimeout(timer);
      }
    }, [isTransitioning]);

    // Auto-slide functionality
    useEffect(() => {
      if (!autoSlide || paused || !lectures || lectures.length === 0) return;
      const slideInterval = setInterval(nextSlide, interval);
      return () => clearInterval(slideInterval);
    }, [paused, autoSlide, interval, nextSlide, lectures]);

    if (loading) {
      return (
        <div 
          ref={ref}
          id="guests" 
          data-section="guests"
          className="flex flex-col items-center justify-center min-h-[400px]"
        >
          <div className="text-5xl md:text-7xl font-gta tracking-wider w-full text-center mb-4 text-[#F77039]">
            Guest Lectures
          </div>
          <div className="text-white text-xl">Loading lectures...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div 
          ref={ref}
          id="guests" 
          data-section="guests"
          className="flex flex-col items-center justify-center min-h-[400px]"
        >
          <div className="text-5xl md:text-7xl font-gta tracking-wider w-full text-center mb-4 text-[#F77039]">
            Guest Lectures
          </div>
          <div className="text-white text-xl">Error: {error}</div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        id="guests"
        data-section="guests"
        className={`
          transition-all duration-700 ease-out 
          ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}
        `}
        {...props}
      >
        <div className="flex flex-col gap-8 w-full mx-auto">
          <div className="text-5xl md:text-7xl font-gta tracking-wider w-full text-center mb-4 text-[#F77039] text-shadow-xl text-shadow-[#F77039]">
            Guest Lectures
          </div>

          <div
            ref={carouselRef}
            className="relative w-full overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div
              className="flex w-full"
              onTransitionEnd={handleTransitionEnd}
              style={{
                width: loopedItems.length > 0 ? `${(100 * loopedItems.length) / visibleCount}%` : '100%',
                transition: isTransitioning ? "transform 0.7s ease-in-out" : "none",
                transform: loopedItems.length > 0 ? `translateX(-${(current * 100) / loopedItems.length}%)` : 'translateX(0)',
              }}
            >
              {loopedItems.map((lecture, idx) => (
                <div
                  key={idx}
                  className="box-border p-5"
                  style={{ flex: loopedItems.length > 0 ? `0 0 ${100 / loopedItems.length}%` : '0 0 100%' }}
                >
                  <div className="h-full transform transition-transform duration-500 w-full flex justify-around hover:scale-105 hover:-translate-y-2">
                    <ProfileCard
                      name={lecture.name}
                      description={lecture.desc}
                      imageUrl={lecture.imageUrl}
                      linkedInlink={lecture.linkedin}
                      xlink={lecture.facebook}
                      instagramlink={lecture.insta}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Arrows */}
            <button
              onClick={prevSlide}
              className="absolute top-1/2 left-2 -translate-y-1/2 bg-black/50 text-white rounded-full h-10 w-10 md:h-12 md:w-12 flex items-center justify-center transition-all duration-300 hover:bg-white/20"
              aria-label="Previous Slide"
            >
              &lt;
            </button>
            <button
              onClick={nextSlide}
              className="absolute top-1/2 right-2 -translate-y-1/2 bg-black/50 text-white rounded-full h-10 w-10 md:h-12 md:w-12 flex items-center justify-center transition-all duration-300 hover:bg-white/20"
              aria-label="Next Slide"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    );
  }
);

Carousel.displayName = 'Carousel';

export default Carousel;

