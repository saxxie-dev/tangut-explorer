import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { getAtprotoClient } from "../utils/atproto";

export function SettingsDropdown() {
    const [isOpen, setIsOpen] = createSignal(false);
    const [handle, setHandle] = createSignal("");
    const [session, setSession] = createSignal<any>(null);
    const [profile, setProfile] = createSignal<any>(null);
    const [loading, setLoading] = createSignal(true);
    const [client, setClient] = createSignal<any>(null);
    const [signingIn, setSigningIn] = createSignal(false);

    // Theme state
    const [theme, setTheme] = createSignal<"light" | "dark" | "system">("system");

    const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (isOpen() && !target.closest('.settings-dropdown-container')) {
            setIsOpen(false);
        }
    };

    const fetchProfile = async (s: any) => {
        if (!s || typeof window === 'undefined') return;
        try {
            const { Agent } = await import("@atproto/api");
            const agent = new Agent(s);
            const { data } = await agent.getProfile({ actor: s.sub });
            setProfile(data);
        } catch (err) {
            console.warn("Failed to fetch ATProto profile:", err);
            try {
                const session = await s.sessionGetter(s.sub);
                if (session?.handle) {
                    setProfile({ handle: session.handle, did: s.sub });
                }
            } catch (err2) {
                console.warn("Failed to get ATProto session:", err2);
            }
        }
    };

    // Theme logic
    const applyTheme = (t: "light" | "dark" | "system") => {
        if (typeof document === 'undefined') return;
        const html = document.documentElement;
        if (t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
            html.classList.add("dark");
        } else {
            html.classList.remove("dark");
        }
    };

    const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
        setTheme(newTheme);
        if (newTheme === "system") {
            localStorage.removeItem("theme");
        } else {
            localStorage.setItem("theme", newTheme);
        }
        applyTheme(newTheme);
    };

    onMount(async () => {
        if (typeof document !== 'undefined') {
            document.addEventListener('click', handleClickOutside);

            // Initialize theme
            const savedTheme = localStorage.getItem("theme");
            if (savedTheme === "light" || savedTheme === "dark") {
                setTheme(savedTheme);
                applyTheme(savedTheme);
            } else {
                setTheme("system");
                applyTheme("system");
            }
        }

        try {
            const c = await getAtprotoClient();
            setClient(c);
            const result = await c.init();
            if (result?.session) {
                setSession(result.session);
                fetchProfile(result.session);
            }
        } catch (err) {
            console.error("ATProto OAuth init error:", err);
        } finally {
            setLoading(false);
        }
    });

    onCleanup(() => {
        if (typeof document !== 'undefined') {
            document.removeEventListener('click', handleClickOutside);
        }
    });

    const handleLogin = async (e: Event) => {
        e.preventDefault();
        const h = handle().trim();
        const c = client();
        if (!c || !h) return;

        setSigningIn(true);
        try {
            await c.signIn(h);
        } catch (err) {
            console.error("ATProto login error:", err);
            alert("Failed to login. Please check your handle.");
            setSigningIn(false);
        }
    };

    const handleLogout = async () => {
        const s = session();
        const c = client();
        if (!s || !c) return;
        try {
            const sub = s.sub;
            if (sub) {
                const sessionObj = await c.restore(sub);
                await sessionObj.signOut();
            }
        } catch (err) {
            console.error("ATProto logout error:", err);
        } finally {
            setSession(null);
            setProfile(null);
            setIsOpen(false);
        }
    };

    const getDisplayName = () => {
        const p = profile();
        if (p?.handle) return `@${p.handle}`;
        const s = session();
        const did = s?.did || s?.sub;
        if (did) {
            return did.replace('did:plc:', '').substring(0, 12) + '...';
        }
        return "Authenticated";
    };

    const getInitial = () => {
        const name = getDisplayName();
        if (name.startsWith('@')) return name.charAt(1).toUpperCase();
        return name.charAt(0).toUpperCase();
    };

    return (
        <div class="relative settings-dropdown-container">
            <button
                onClick={() => setIsOpen(!isOpen())}
                class="relative w-10 h-10 flex items-center justify-center text-beige-100 dark:text-brown-900 hover:bg-brown-800 dark:hover:bg-beige-200 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beige-100 dark:focus-visible:ring-brown-900"
                aria-label="Settings Menu"
                aria-expanded={isOpen()}
            >
                {/* Settings/Gear Icon */}
                <svg class="w-5 h-5 fill-none stroke-current" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            </button>

            <Show when={isOpen()}>
                <div
                    class="absolute right-0 mt-2 w-72 bg-white dark:bg-brown-800 rounded-lg shadow-xl border border-beige-200 dark:border-brown-700 z-[60] p-4 overflow-hidden origin-top-right transition-all duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div class="flex flex-col gap-5">
                        <div class="flex items-center justify-between">
                            <span class="font-ui font-bold text-brown-900 dark:text-beige-100 uppercase tracking-widest text-sm">Settings</span>
                        </div>

                        {/* Theme Options */}
                        <div class="flex flex-col gap-2">
                            <span class="text-xs font-ui uppercase tracking-wider text-brown-500 dark:text-beige-400 font-semibold">Appearance</span>
                            <div class="flex bg-beige-50 dark:bg-brown-900 rounded-md p-1 border border-beige-200 dark:border-brown-700">
                                <button
                                    onClick={() => handleThemeChange('light')}
                                    class={`flex-1 flex justify-center items-center py-1.5 text-xs font-semibold rounded-md transition-colors ${theme() === 'light' ? 'bg-white dark:bg-brown-800 text-brown-900 dark:text-beige-100 shadow-sm' : 'text-brown-600 dark:text-beige-400 hover:text-brown-900 dark:hover:text-beige-100'}`}
                                >
                                    Light
                                </button>
                                <button
                                    onClick={() => handleThemeChange('dark')}
                                    class={`flex-1 flex justify-center items-center py-1.5 text-xs font-semibold rounded-md transition-colors ${theme() === 'dark' ? 'bg-white dark:bg-brown-800 text-brown-900 dark:text-beige-100 shadow-sm' : 'text-brown-600 dark:text-beige-400 hover:text-brown-900 dark:hover:text-beige-100'}`}
                                >
                                    Dark
                                </button>
                                <button
                                    onClick={() => handleThemeChange('system')}
                                    class={`flex-1 flex justify-center items-center py-1.5 text-xs font-semibold rounded-md transition-colors ${theme() === 'system' ? 'bg-white dark:bg-brown-800 text-brown-900 dark:text-beige-100 shadow-sm' : 'text-brown-600 dark:text-beige-400 hover:text-brown-900 dark:hover:text-beige-100'}`}
                                >
                                    System
                                </button>
                            </div>
                        </div>

                        {/* Language Placeholder */}
                        <div class="flex flex-col gap-2">
                            <span class="text-xs font-ui uppercase tracking-wider text-brown-500 dark:text-beige-400 font-semibold">Language</span>
                            <div class="flex bg-beige-50 dark:bg-brown-900 rounded-md p-1 border border-beige-200 dark:border-brown-700 relative opacity-50 cursor-not-allowed">
                                <button disabled class="flex-1 flex py-1.5 text-xs font-semibold rounded-md bg-white dark:bg-brown-800 text-brown-900 dark:text-beige-100 shadow-sm justify-center cursor-not-allowed">
                                    En
                                </button>
                                <button disabled class="flex-1 flex py-1.5 text-xs font-semibold rounded-md text-brown-600 dark:text-beige-400 justify-center cursor-not-allowed items-center gap-2">
                                    <span>中</span>
                                    <span class="text-[9px] bg-brown-800 text-white dark:bg-beige-200 dark:text-brown-900 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tight shadow-sm whitespace-nowrap">即将</span>
                                </button>
                            </div>
                        </div>

                        {/* ATProto Section */}
                        <div class="flex flex-col gap-3">
                            <span class="text-xs font-ui uppercase tracking-wider text-brown-500 dark:text-beige-400 font-semibold">Atproto integration</span>
                            <Show when={!loading()} fallback={<p class="text-sm text-brown-600 dark:text-beige-400 flex items-center gap-2"><svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Connecting...</p>}>
                                <Show when={session()} fallback={
                                    <form onSubmit={handleLogin} class="flex flex-col gap-2">
                                        <input
                                            type="text"
                                            placeholder="Eg: handle.bsky.social"
                                            value={handle()}
                                            onInput={(e) => setHandle(e.currentTarget.value)}
                                            class="px-3 py-2 text-sm rounded border border-beige-300 dark:border-brown-600 bg-white dark:bg-brown-900 text-brown-900 dark:text-beige-100 focus:outline-none focus:ring-2 focus:ring-brown-500 placeholder-brown-400 dark:placeholder-brown-500 relative"
                                        />
                                        <button
                                            type="submit"
                                            disabled={signingIn()}
                                            class={`bg-brown-900 dark:bg-beige-100 text-beige-100 dark:text-brown-900 py-2 rounded text-sm font-semibold hover:bg-brown-800 dark:hover:bg-beige-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brown-900 dark:focus:ring-offset-brown-800 dark:focus:ring-beige-100 flex items-center justify-center gap-2 ${signingIn() ? 'opacity-70 cursor-not-allowed' : ''}`}
                                        >
                                            <Show when={signingIn()} fallback={"Sign in"}>
                                                <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Signing in...
                                            </Show>
                                        </button>
                                    </form>
                                }>
                                    <div class="flex flex-col gap-2">
                                        <div class="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-beige-50 dark:bg-brown-900 border border-beige-200 dark:border-brown-700">
                                            <div
                                                class="w-8 h-8 rounded-full bg-brown-200 dark:bg-brown-700 flex items-center justify-center text-xs text-brown-700 dark:text-beige-300 font-bold uppercase overflow-hidden ring-2 ring-white dark:ring-brown-800"
                                                style={profile()?.avatar ? { "background-image": `url(${profile().avatar})`, "background-size": "cover" } : {}}
                                            >
                                                <Show when={!profile()?.avatar}>
                                                    {getInitial()}
                                                </Show>
                                            </div>
                                            <div class="flex flex-col flex-1 min-w-0">
                                                <span class="text-sm font-semibold text-brown-900 dark:text-beige-100 truncate">
                                                    {getDisplayName()}
                                                </span>
                                                <button
                                                    onClick={handleLogout}
                                                    class="text-xs text-brown-500 hover:text-red-600 dark:text-brown-400 dark:hover:text-red-400 text-left transition-colors self-start mt-0.5 font-medium"
                                                >
                                                    Sign out
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </Show>
                            </Show>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}
