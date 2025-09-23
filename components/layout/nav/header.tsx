"use client";

import React from "react";
import Link from "next/link";
import { Icon } from "../../icon";
import { useLayout } from "../layout-context";
import { Menu, X } from "lucide-react";

export const Header = () => {
  const { globalSettings } = useLayout();
  const header = globalSettings!.header!;

  const [menuState, setMenuState] = React.useState(false);

  return (
    <header>
      <nav
        data-state={menuState && "active"}
        className="fixed inset-x-0 top-0 z-50 w-full bg-black text-white"
      >
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="relative flex flex-wrap items-center justify-between gap-4 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full items-center justify-between gap-6">
              {/* Brand */}
              <Link
                href="/"
                aria-label="home"
                className="flex items-center gap-2 font-mono"
              >
                {/* <Icon
                  parentColor={header.color!}
                  data={{
                    name: header.icon!.name,
                    color: "white",
                    style: header.icon!.style,
                  }}
                /> */}
                <span className="text-sm md:text-base">{header.name}</span>
              </Link>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setMenuState((s) => !s)}
                aria-label={menuState ? "Close Menu" : "Open Menu"}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="text-white in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="text-white in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>

              {/* Desktop nav */}
              <div className="hidden lg:block">
                <ul className="flex gap-6 text-sm font-mono">
                  {header.nav!.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item!.href!}
                        className="block text-white/80 hover:text-white duration-150"
                      >
                        <span>{item!.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Mobile nav */}
            <div className="in-data-[state=active]:block mb-2 hidden w-full items-center justify-end lg:in-data-[state=active]:flex lg:mb-0 lg:w-fit">
              <div className="w-full lg:hidden">
                <ul className="space-y-4 bg-black p-4 text-base font-mono">
                  {header.nav!.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item!.href!}
                        className="block text-white/80 hover:text-white duration-150"
                      >
                        <span>{item!.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
