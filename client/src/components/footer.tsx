import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  FaFacebook,
  FaFacebookMessenger,
  FaTwitter,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa";
import { useLanguage } from "../contexts/language-context";
import { BRAND, telHref } from "@/lib/brand";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/hooks/use-auth";

// Define a type for our footer settings data
interface FooterSettings {
  companyName: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  copyright: string;
  logoUrl?: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  quickLinks: Array<{
    title: string;
    url: string;
  }>;
}

// Footer settings from the admin panel; shared with the quick menu (same cache key)
export function useFooterSettings() {
  return useQuery<FooterSettings>({
    queryKey: ["footer-settings"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/settings/footer");
        if (!response.ok) throw new Error("Failed to fetch footer settings");
        const footerInfo = (await response.json()) as any;

        // If API returns empty object
        if (!footerInfo || Object.keys(footerInfo).length === 0)
          return {} as FooterSettings;

        // Map API response (camelCase from Drizzle) to Component state
        return {
          companyName: footerInfo.companyName || footerInfo.company_name,
          description: footerInfo.description,
          address: footerInfo.address,
          phone: footerInfo.phone,
          email: footerInfo.email,
          logoUrl: footerInfo.logoUrl || footerInfo.logo_url,
          socialLinks: footerInfo.socialLinks || footerInfo.social_links || {},
          quickLinks: footerInfo.quickLinks || footerInfo.quick_links || [],
          // Schema has 'copyrightText', component expects 'copyright'
          copyright:
            footerInfo.copyrightText ||
            footerInfo.copyright ||
            footerInfo.copyright_text,
        };
      } catch (error) {
        console.error("Error fetching footer settings:", error);
        return {} as FooterSettings;
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export function Footer() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  // Fetch footer settings from API
  const { data: footerData, isLoading } = useFooterSettings();

  // If we're still loading, show a placeholder
  if (isLoading) {
    return (
      <footer className="relative overflow-hidden pt-16 pb-8 bg-white text-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="animate-pulse h-24"></div>
        </div>
      </footer>
    );
  }

  // Set default values if data hasn't loaded yet
  const {
    companyName = BRAND.name,
    description = "Чанартай махны бүтээгдэхүүн",
    phone = BRAND.phone,
    email = "",
    copyright = t.copyright,
    socialLinks = {},
    quickLinks = [],
  } = footerData || {};

  // Render social media icons based on available links
  const renderSocialIcons = () => {
    const icons = [];

    if (socialLinks.facebook) {
      icons.push(
        <a
          key="facebook"
          href={socialLinks.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors duration-300 flex items-center justify-center"
        >
          <FaFacebook className="text-xl" />
        </a>,
      );
    }

    if (socialLinks.twitter) {
      icons.push(
        <a
          key="twitter"
          href={socialLinks.twitter}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors duration-300 flex items-center justify-center"
        >
          <FaTwitter className="text-xl" />
        </a>,
      );
    }

    if (socialLinks.instagram) {
      icons.push(
        <a
          key="instagram"
          href={socialLinks.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors duration-300 flex items-center justify-center"
        >
          <FaInstagram className="text-xl" />
        </a>,
      );
    }

    if (socialLinks.youtube) {
      icons.push(
        <a
          key="youtube"
          href={socialLinks.youtube}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors duration-300 flex items-center justify-center"
        >
          <FaYoutube className="text-xl" />
        </a>,
      );
    }

    // If no social links are provided, return placeholders
    if (icons.length === 0) {
      return (
        <>
          <div className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors duration-300">
            <span className="material-icons">facebook</span>
          </div>
          <div className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors duration-300">
            <span className="material-icons">insert_comment</span>
          </div>
          <div className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors duration-300">
            <span className="material-icons">photo_camera</span>
          </div>
        </>
      );
    }

    return icons;
  };

  // Quick links section has been removed

  return (
    <footer>
      {/* Top: brand + contact */}
      <div className="bg-surface">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-12 grid gap-8 md:grid-cols-[1.2fr_1fr] items-start">
          <div>
            <BrandLogo className="h-24 md:h-28 w-auto" />
            {description && (
              <p className="mt-3 max-w-sm text-sm text-ink/60">{description}</p>
            )}
          </div>

          {/* Contact info */}
          <ul className="space-y-2.5 text-sm text-ink/70">
            <li className="flex items-center gap-3">
              <FaFacebook className="text-brand text-base flex-shrink-0" />
              <a
                href={BRAND.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand transition-colors duration-200"
              >
                {t.visitPage}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <FaFacebookMessenger className="text-brand text-base flex-shrink-0" />
              <a
                href={BRAND.messengerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-brand transition-colors duration-200"
              >
                Messenger
              </a>
            </li>
            <li className="flex items-center gap-3">
              <span className="material-icons text-brand text-base flex-shrink-0">
                phone
              </span>
              <a
                href={telHref(phone || BRAND.phone)}
                className="font-display text-[15px] font-bold text-ink hover:text-brand transition-colors duration-200"
              >
                {phone}
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom: legal, copyright, admin login */}
      {/* Extra bottom padding on mobile clears the TOP button above the bottom nav */}
      <div className="bg-bark">
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6 pb-24 md:pb-6 flex flex-col items-center gap-3 text-xs text-white/50 text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 whitespace-nowrap">
            <Link href="/privacy">
              <span className="font-bold text-white hover:text-white/80 transition-colors duration-200">
                Нууцлалын бодлого
              </span>
            </Link>
            <span className="text-white/20">|</span>
            <Link href="/terms">
              <span className="hover:text-white transition-colors duration-200">
                Үйлчилгээний нөхцөл
              </span>
            </Link>
            <span className="text-white/20">|</span>
            <Link href={user?.isAdmin ? "/admin" : "/admin/login"}>
              <div className="inline-flex items-center hover:text-white transition-colors duration-200">
                <span className="material-icons text-xs mr-1">
                  admin_panel_settings
                </span>
                <span>{user?.isAdmin ? "Админ удирдлага" : t.adminLogin}</span>
              </div>
            </Link>
          </div>
          <p>{t.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
