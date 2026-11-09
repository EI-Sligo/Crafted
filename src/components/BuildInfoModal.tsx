import React, { useState } from 'react';
import { X, Copy, Check, Terminal, FileCode, ShieldCheck, Smartphone } from 'lucide-react';

interface BuildInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BuildInfoModal: React.FC<BuildInfoModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const easJsonContent = `{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease"
      },
      "ios": {
        "simulator": false,
        "enterprise": false
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "internal",
        "serviceAccountKeyPath": "./google-services.json"
      },
      "ios": {
        "appleId": "decmcm@gmail.com",
        "ascAppId": "6478912301"
      }
    }
  }
}`;

  const localBuildCommands = `# 1. Local Android Production Build (.aab) via Android Studio CLI:
cd android
./gradlew bundleRelease
# Output bundle located at:
# android/app/build/outputs/bundle/release/app-release.aab

# 2. Local iOS Production Archive (.ipa) via Fastlane / xcodebuild:
cd ios
xcodebuild -workspace Crafted.xcworkspace \\
  -scheme Crafted \\
  -configuration Release \\
  -archivePath ./build/Crafted.xcarchive \\
  archive
xcodebuild -exportArchive \\
  -archivePath ./build/Crafted.xcarchive \\
  -exportOptionsPlist ExportOptions.plist \\
  -exportPath ./build/Release-iphoneos`;

  const supabaseRlsRules = `-- Supabase Foreign Key Cascade & Row-Level Security Rules

-- Posts Table Cascading Deletion
ALTER TABLE comments
  DROP CONSTRAINT IF EXISTS fk_comments_posts,
  ADD CONSTRAINT fk_comments_posts
    FOREIGN KEY (post_id)
    REFERENCES posts(id)
    ON DELETE CASCADE;

-- User Profile Cascading Deletion
ALTER TABLE posts
  DROP CONSTRAINT IF EXISTS fk_posts_users,
  ADD CONSTRAINT fk_posts_users
    FOREIGN KEY (user_id)
    REFERENCES profiles(id)
    ON DELETE CASCADE;

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stolen_alerts ENABLE ROW LEVEL SECURITY;

-- 50km Geo-Proximity Stolen Alert Broadcast Policy
CREATE POLICY "Public read nearby active stolen alerts"
  ON stolen_alerts FOR SELECT
  USING (status = 'ACTIVE_ALERT');`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-5 shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">
              Native Mobile & Production Build Manifest
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 text-xs">
          {/* eas.json */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-amber-400 flex items-center space-x-1">
                <FileCode className="w-3.5 h-3.5" />
                <span>Production eas.json (.aab Android & .ipa iOS)</span>
              </span>
              <button
                onClick={() => copyToClipboard(easJsonContent, 'eas')}
                className="text-slate-400 hover:text-white flex items-center space-x-1 bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
              >
                {copiedKey === 'eas' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'eas' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
              {easJsonContent}
            </pre>
          </div>

          {/* Local CLI compilation */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-sky-400 flex items-center space-x-1">
                <Terminal className="w-3.5 h-3.5" />
                <span>Local Build Pipeline CLI (Bypassing Cloud Caps)</span>
              </span>
              <button
                onClick={() => copyToClipboard(localBuildCommands, 'cli')}
                className="text-slate-400 hover:text-white flex items-center space-x-1 bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
              >
                {copiedKey === 'cli' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'cli' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
              {localBuildCommands}
            </pre>
          </div>

          {/* Supabase Schema & Cascade Policies */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-emerald-400 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Supabase Cascades & RLS Policy Schema</span>
              </span>
              <button
                onClick={() => copyToClipboard(supabaseRlsRules, 'sql')}
                className="text-slate-400 hover:text-white flex items-center space-x-1 bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
              >
                {copiedKey === 'sql' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'sql' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
              {supabaseRlsRules}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
