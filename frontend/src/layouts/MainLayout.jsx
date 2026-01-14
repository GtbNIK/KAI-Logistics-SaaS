import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const MainLayout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="min-h-screen bg-slate-100 flex font-sans text-slate-900">
            {/* Sidebar Component */}
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

            {/* Main Content Area */}
            <div 
                className={`
                    flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out
                    ${isSidebarOpen ? 'ml-64' : 'ml-20'}
                `}
            >
                {/* Navbar Superior */}
                <Topbar toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
                
                <main className="flex-1 p-8 bg-slate-100 relative">
                    {/* Background Pattern muy sutil */}
                    <div className="absolute inset-0 opacity-[0.4] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
                    
                    <div className="relative z-10 max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
