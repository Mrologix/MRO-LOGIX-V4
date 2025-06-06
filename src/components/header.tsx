"use client";

import { Button } from "@/components/ui/button";
import {
NavigationMenu,
NavigationMenuContent,
NavigationMenuItem,
NavigationMenuLink,
NavigationMenuList,
NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Menu, MoveRight, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

const Header1 = () => {
const navigationItems = [
    {
    title: "Home",
    href: "/",
    description: "",
    },
    {
    title: "Tool",
    description: "Streamline your MRO operations.",
    items: [
        {
        title: "Flight Records",
        href: "#",
        },
        {
        title: "Statistics",
        href: "#",
        },
        {
        title: "Inventory Stock",
        href: "#",
        },
        {
        title: "Task Cards",
        href: "#",
        },
    ],
    },
    {
    title: "Resource",
    href: "#",
    description: "",
    mobileHidden: true,
    },
    {
    title: "Pricing",
    href: "#",
    description: "",
    mobileHidden: true,
    },
    {
    title: "About",
    href: "#",
    description: "",
    mobileHidden: true,
    },
];

const [isOpen, setOpen] = useState(false);
const menuRef = useRef<HTMLDivElement>(null);
const buttonRef = useRef<HTMLButtonElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (
      isOpen &&
      menuRef.current && 
      buttonRef.current &&
      !menuRef.current.contains(event.target as Node) &&
      !buttonRef.current.contains(event.target as Node)
    ) {
      setOpen(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isOpen]);
return (
    <header className="w-full z-40 fixed top-0 left-0 bg-background border-b">
    <div className="container relative mx-auto min-h-14 flex gap-4 flex-row lg:grid lg:grid-cols-2 items-center px-4 md:px-6 lg:px-8">
        <div className="justify-start items-center gap-4 lg:flex flex-row pl-0 md:pl-2">
        <NavigationMenu className="flex justify-start items-start">
            <NavigationMenuList className="flex justify-start gap-4 flex-row">
            {navigationItems.map((item) => (
                <NavigationMenuItem key={item.title} className={item.mobileHidden ? "hidden lg:block" : ""}>
                {item.href ? (
                    <>
                    <NavigationMenuLink asChild>
                        <Link href={item.href}>
                          <Button variant="ghost">{item.title}</Button>
                        </Link>
                    </NavigationMenuLink>
                    </>
                ) : (
                    <>
                    <NavigationMenuTrigger className="font-medium text-sm hidden lg:flex">
                        {item.title}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="!w-[450px] p-4">
                        <div className="flex flex-col lg:grid grid-cols-2 gap-4">
                        <div className="flex flex-col h-full justify-between">
                            <div className="flex flex-col">
                            <p className="text-base">{item.title}</p>
                            <p className="text-muted-foreground text-sm">
                                {item.description}
                            </p>
                            </div>
                            <Link href="/contact">
                              <Button size="sm" className="mt-10">
                                Book a call today
                              </Button>
                            </Link>
                        </div>
                        <div className="flex flex-col text-sm h-full justify-end">
                            {item.items?.map((subItem) => (
                            <NavigationMenuLink
                                href={subItem.href}
                                key={subItem.title}
                                className="flex flex-row justify-between items-center hover:bg-muted py-2 px-4 rounded"
                            >
                                <span>{subItem.title}</span>
                                <MoveRight className="w-4 h-4 text-muted-foreground" />
                            </NavigationMenuLink>
                            ))}
                        </div>
                        </div>
                    </NavigationMenuContent>
                    </>
                )}
                </NavigationMenuItem>
            ))}
            </NavigationMenuList>
        </NavigationMenu>
        </div>
        <div className="flex justify-end w-full gap-4">
        <ThemeToggle />
        <Link href="/contact">
          <Button variant="ghost" className="hidden md:inline">
              Book a demo
          </Button>
        </Link>
        <div className="border-r hidden md:inline"></div>
        <Link href="/signin">
          <Button variant="outline">Sign in</Button>
        </Link>
        <Link href="/register">
          <Button>Get started</Button>
        </Link>
        </div>
        <div className="flex w-12 shrink lg:hidden items-end justify-end">
        <Button ref={buttonRef} variant="ghost" onClick={() => setOpen(!isOpen)}>
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
        {isOpen && (
            <div ref={menuRef} className="absolute top-14 border-t flex flex-col w-full right-0 bg-background shadow-lg py-4 px-6 container gap-8">
            {navigationItems.map((item) => (
                <div key={item.title}>
                <div className="flex flex-col gap-2">
                    {item.href ? (
                    <Link
                        href={item.href}
                        className="flex justify-between items-center"
                    >
                        <span className="text-lg">{item.title}</span>
                        <MoveRight className="w-4 h-4 stroke-1 text-muted-foreground" />
                    </Link>
                    ) : (
                    <p className="text-lg">{item.title}</p>
                    )}
                    {item.items &&
                    item.items.map((subItem) => (
                        <Link
                        key={subItem.title}
                        href={subItem.href}
                        className="flex justify-between items-center"
                        >
                        <span className="text-muted-foreground">
                            {subItem.title}
                        </span>
                        <MoveRight className="w-4 h-4 stroke-1" />
                        </Link>
                    ))}
                </div>
                </div>
            ))}
            <div className="flex flex-col gap-4 mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg">Theme</span>
                <ThemeToggle />
              </div>
              <Link
                href="/register"
                className="flex justify-between items-center"
              >
                <span className="text-lg font-medium text-primary">Get Started</span>
                <MoveRight className="w-4 h-4 stroke-1" />
              </Link>
            </div>
            </div>
        )}
        </div>
    </div>
    </header>
);
};

export default Header1;