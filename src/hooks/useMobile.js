import { useState, useEffect } from "react";

const useMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // 768px is standard md breakpoint
        };

        // Check on mount
        checkMobile();

        // Listen for resize
        window.addEventListener("resize", checkMobile);

        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    return isMobile;
};

export default useMobile;
