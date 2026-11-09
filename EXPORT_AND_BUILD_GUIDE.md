# Crafted — Complete Step-by-Step Export & APK Build Guide
### Simple instructions for creating the Live Production APK, Demo Showcase APK, and removing demo data

---

## 1. Overview: The Two Apps

This codebase produces two distinct applications:

| Application | Name on Phone | Package Identifier | Features |
| :--- | :--- | :--- | :--- |
| **Live Production App** | **Crafted** | `com.crafted.tradenet` | 100% real Supabase cloud data, real user accounts, zero demo data, zero developer tools. Ready for Google Play Store. |
| **Demo Showcase App** | **Crafted Demo** | `com.crafted.tradenet.demo` | Standalone showcase with pre-loaded demo personas, mock jobs, and test tools. Can be installed on the same phone alongside the Live app without conflicts. |

---

## 2. Why Is There Only One `android` Folder? (And How to Have Two)

You might wonder why you only see **one** `android` folder instead of two:

In cross-platform mobile development (Capacitor), the `android` folder is a **native shell template**. When you run a build command, Capacitor automatically injects the correct app code into this `android` folder:
- Running `npm run build:android:live` configures `android` for **Crafted** (`com.crafted.tradenet`).
- Running `npm run build:android:demo` configures `android` for **Crafted Demo** (`com.crafted.tradenet.demo`).

### Want Two Completely Separate Folders on Your Computer? (Recommended)
If you want two permanent folders so you never have to re-sync back and forth:
1. Export / download the ZIP and extract it.
2. In File Explorer (Windows) or Finder (Mac), **copy and paste the entire extracted project folder**.
3. Rename the two folders:
   - Folder 1: **`Crafted-Live`**
   - Folder 2: **`Crafted-Demo`**
4. In `Crafted-Live`, you only ever run `npm run build:android:live`.
5. In `Crafted-Demo`, you only ever run `npm run build:android:demo`.
6. You now have two distinct Android Studio projects that you can open independently!

---

## 3. Step 1: Export / Download This Project

1. Look at the top-right header in Google AI Studio Build.
2. Click the **Export** / **Download ZIP** icon (or **Push to GitHub** if you prefer git).
3. If you downloaded a ZIP file:
   - Right-click the `.zip` file on your computer and choose **Extract All**.
   - Extract it to a clean folder on your computer (for example: `C:\Crafted` on Windows or `~/Crafted` on Mac).

---

## 4. Step 2: Install Free Prerequisites (One-Time Setup)

You only need two free programs installed on your computer:

1. **Node.js (LTS version)**:
   - Download and install from [https://nodejs.org](https://nodejs.org) (choose the **LTS** version).
   - Keep all default settings during installation.

2. **Android Studio**:
   - Download and install free official Android Studio from [https://developer.android.com/studio](https://developer.android.com/studio).
   - During setup, leave all default checkmarks enabled (**Android SDK**, **Android SDK Platform-Tools**, **Android Virtual Device**).
   - Once installed, open Android Studio once so it finishes downloading the core Android SDK tools.

---

## 5. Step 3: Configure Your Live Database Keys

Before building the **Live** app, make sure your production database credentials are in place:

1. Open the project folder on your computer.
2. In the root directory, check for a file named `.env`.
   - If it does not exist, make a copy of `.env.example` and rename it to `.env`.
3. Open `.env` in any text editor (Notepad, TextEdit, VS Code) and put in your live Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sbp_your_publishable_key_here
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### 💡 Should You Use the New Supabase "Publishable Key" or "Anon Key"?
**You can use either! Both are supported automatically:**
- **Modern Supabase Projects**: Supabase has introduced the **Publishable API Key** (typically starts with `sbp_...`). You can place it in `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Existing / Legacy Supabase Projects**: The classic **Anon public key** (starts with `eyJ...`) in `VITE_SUPABASE_ANON_KEY` works seamlessly.
- If both or either are provided in `.env`, Crafted will automatically detect and use your active key.

4. Save and close the file. *(Note: The Demo app does not require live credentials as it runs an offline showcase).*

---

## 6. Step 4: Build the LIVE Production APK ("Crafted")

> ⚠️ **IMPORTANT — WHERE TO RUN COMMANDS:**
> Always run all `npm` commands in the **main root project folder** (e.g. `crafted`), **NEVER inside the `android` folder**.
> - If your PowerShell or Command Prompt prompt shows `...\crafted\android>`, type `cd ..` and press Enter to return to the root folder.
> - The `android` folder is **only** opened when you launch **Android Studio** (**File → Open → select `android`**).

### A. Prepare and sync the web assets
1. Open a terminal or Command Prompt in your project root folder:
   - **Windows**: Open the root `crafted` folder in File Explorer, type `cmd` into the top address bar, and press Enter.
   - **Mac**: Open **Terminal**, type `cd ` (with a space), drag the root folder into Terminal, and press Enter.
2. Run these commands:
   ```bash
   npm install
   npm run build:android:live
   ```
   *(This builds the clean production web bundle and copies it directly into the native Android folder).*

### B. Generate the APK in Android Studio
1. Open **Android Studio**.
2. Click **Open** (or **File → Open**).
3. Browse to your project folder and select the **`android`** subfolder (the one containing `build.gradle` and `app`). Click **OK**.
4. Wait 1 to 2 minutes while Android Studio indexes the files and runs Gradle sync (a progress bar is visible at the bottom right).
5. When the sync finishes:
   - Click the top menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
6. When the build completes, a small pop-up appears in the bottom right corner:
   > **Build APK(s): APK(s) generated successfully for 1 module.**
   > `locate`
7. Click **locate**. File Explorer / Finder will open to:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```
8. Rename this file to **`Crafted-Live.apk`**.

---

## 7. Step 5: Build the DEMO Showcase APK ("Crafted Demo")

If you want a standalone demo version to show colleagues or clients without touching your real database:

1. In your terminal/Command Prompt, run:
   ```bash
   npm run build:android:demo
   ```
   *(This configures the showcase edition with pre-loaded mock data, instant demo personas, and auto-logs in on first open so it immediately displays the full feed, jobs, marketplace, and radar alerts).*

> 💡 **What to Expect When Opening the Apps on Your Phone:**
> - **Crafted Demo (`npm run build:android:demo`)**: Opens **straight into the full app** with Sean Murphy logged in and all test jobs, marketplace tools, and posts visible — exactly matching what you see in the AI Studio preview.
> - **Crafted Live (`npm run build:android:live`)**: Opens to the clean **Sign In / Registration** screen for your real users. To test or explore without creating a real database account, simply tap **"Explore App in Preview / Guest Mode"** to browse all tabs and screens.
2. Switch to **Android Studio** (with the `android` folder open).
3. Click the **Sync Project with Gradle Files** icon (the small elephant icon with blue arrows in the top toolbar, or go to **File → Sync Project with Gradle Files**).
4. Click **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
5. Click **locate** when finished.
6. Rename this file to **`Crafted-Demo.apk`**.

> **Note:** Because the Demo build automatically uses the package ID `com.crafted.tradenet.demo` and the app name `Crafted Demo`, you can install **both** `Crafted-Live.apk` and `Crafted-Demo.apk` on the same phone at the same time.

---

## 8. Step 6: How to Remove Demo Data After the App Is Live & Public

When your app is launched and published in production, you might want to completely wipe out all mock personas, sample posts, and demo data from the codebase so nothing remains.

We have created an **automated one-command cleanup script** for this:

### The 1-Step Automated Purge:
In your terminal/Command Prompt, simply run:
```bash
npm run purge:demo
```

### What this command automatically does:
1. **Empties All Demo Data**: Wipes all mock users (Sean Murphy, Chloe Byrne, etc.), mock posts, mock jobs, mock classifieds, and mock chat messages from `src/data/seedData.ts`.
2. **Preserves Real Trade Locations**: Keeps all real Irish and global city coordinates (`IRISH_LOCATIONS` and `GLOBAL_LOCATIONS`) so GPS, distance, and location pickers continue working perfectly.
3. **Locks Configuration**: Locks `src/config/appConfig.ts` to permanent pure live production mode.
4. **Safety Backup**: Creates an automatic backup file at `src/data/seedData.demo-backup.ts` just in case you ever want the demo personas back in the future.

### After Running the Purge:
Rebuild your Android app with:
```bash
npm run build:android:live
```
Your app is now 100% clean with zero traces of demo data anywhere in the codebase.

---

## 9. Step 7: How to Install the APK on Your Android Phone

There are two easy ways to install the `.apk` on your phone:

### Method A: Direct File Transfer (Easiest, No Cables Needed)
1. Send the `Crafted-Live.apk` file to yourself using:
   - Google Drive / OneDrive
   - Email attachment
   - WhatsApp / Telegram (sent to your own chat or saved messages)
2. On your Android phone, tap the file to open it.
3. If Android displays a message saying *"For your security, your phone is not allowed to install unknown apps from this source"*:
   - Tap **Settings** on the prompt.
   - Switch on **Allow from this source**.
   - Tap **Back** and tap **Install**.
4. The **Crafted** app icon will appear on your phone's home screen.

### Method B: Via USB Cable from Android Studio
1. On your Android phone, enable **Developer Options**:
   - Go to **Settings → About Phone**.
   - Tap **Build Number** 7 times until it says *"You are now a developer!"*.
   - Go to **Settings → System → Developer Options** and turn ON **USB Debugging**.
2. Connect your phone to your computer with a USB cable.
3. In Android Studio, select your physical phone from the top device dropdown (next to the green hammer and play icons).
4. Click the green **Play (Run 'app')** button. The app will install and open automatically on your phone.

---

## 10. Step 8: Publishing to the Google Play Store (Release Bundle)

When you are ready to publish the Live app to the Google Play Console:

1. Open Android Studio with the `android` folder.
2. Click **Build → Generate Signed Bundle / APK...**
3. Select **Android App Bundle** (Google Play requires `.aab` format) and click **Next**.
4. Under **Key store path**, click **Create new...**:
   - Choose a location on your computer to save your `release-key.jks` file.
   - Enter a password and fill in your name/organization.
   - Keep this `.jks` file safe — you will need it for future app updates.
5. Click **Next**, choose **release**, and click **Finish**.
6. Android Studio will produce a signed `.aab` file located at:
   ```
   android/app/release/app-release.aab
   ```
7. Upload this `.aab` file directly into the **Google Play Console** under **Production → Releases**.

---

## 11. Quick Command Summary

```bash
# 1. Install dependencies
npm install

# 2. Build and sync Live Production App ("Crafted")
npm run build:android:live

# 3. Build and sync Demo Showcase App ("Crafted Demo")
npm run build:android:demo

# 4. Permanently remove all demo data when you are public
npm run purge:demo
```
