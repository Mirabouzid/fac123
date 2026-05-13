import { cn } from "@/lib/utils"
import {
  Users,
  Building2,
  Shield,
  FileText,
  Briefcase,
  Search,
  LayoutDashboard,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Stethoscope,
  ChevronDown,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type UserRole = "candidate" | "employer" | "admin"

interface NavbarProps {
  role: UserRole
  onLogout: () => void
}

const navigationItems = {
  candidate: [
    { name: "Tableau de bord", href: "/candidate", icon: LayoutDashboard },
    { name: "Deposer mon CV", href: "/candidate/cv", icon: FileText },
    { name: "Offres d'emploi", href: "/candidate/jobs", icon: Briefcase },
    { name: "Mes candidatures", href: "/candidate/applications", icon: Search },
  ],
  employer: [
    { name: "Tableau de bord", href: "/employer", icon: LayoutDashboard },
    { name: "Deposer une annonce", href: "/employer/post-job", icon: FileText },
    { name: "Pipeline recrutement", href: "/employer/pipeline", icon: Users },
    { name: "Candidats", href: "/employer/candidates", icon: Search },
    { name: "Historique", href: "/employer/history", icon: Briefcase },
  ],
  admin: [
    { name: "Supervision", href: "/admin", icon: LayoutDashboard },
    { name: "Validation offres", href: "/admin/offers", icon: FileText },
    { name: "Validation candidats", href: "/admin/candidates", icon: Users },
    { name: "Journal d'audit", href: "/admin/audit", icon: Shield },
    { name: "Paiements", href: "/admin/payments", icon: Building2 },
    { name: "Parametres", href: "/admin/settings", icon: Settings },
  ],
}

const roleInfo = {
  candidate: {
    label: "Espace Candidat",
    icon: Users,
    color: "bg-blue-500",
  },
  employer: {
    label: "Espace Cabinet",
    icon: Building2,
    color: "bg-blue-600",
  },
  admin: {
    label: "Espace Admin",
    icon: Shield,
    color: "bg-blue-700",
  },
}

export function Navbar({ role, onLogout }: NavbarProps) {
  const location = useLocation()
  const pathname = location.pathname
  const [mobileOpen, setMobileOpen] = useState(false)

  const items = navigationItems[role]
  const currentRole = roleInfo[role]

  return (
    <>
      {/* Main Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-blue-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-blue-900">Efficience Recrute</h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-blue-700 hover:bg-blue-50"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Role Badge */}
              <div className={cn(
                "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white",
                currentRole.color
              )}>
                <currentRole.icon className="h-4 w-4" />
                <span>{currentRole.label}</span>
              </div>

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="text-blue-600 hover:bg-blue-50">
                <Bell className="h-5 w-5" />
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 text-blue-700 hover:bg-blue-50">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">JD</span>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-blue-700">
                    <Settings className="mr-2 h-4 w-4" />
                    Parametres
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Deconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-blue-600 hover:bg-blue-50"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-blue-100 bg-white">
            <div className="px-4 py-4 space-y-1">
              {/* Role Badge Mobile */}
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white mb-4",
                currentRole.color
              )}>
                <currentRole.icon className="h-4 w-4" />
                <span>{currentRole.label}</span>
              </div>

              {items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-blue-700 hover:bg-blue-50"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}

              <div className="pt-4 border-t border-blue-100 mt-4">
                <button
                  onClick={onLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Deconnexion</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
