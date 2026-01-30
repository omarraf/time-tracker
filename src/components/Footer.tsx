import { useState } from 'react';
import Modal from 'react-modal';

export default function Footer() {
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  return (
    <>
      <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-6">
            <span
              onClick={() => setShowAboutModal(true)}
              className="text-sm text-gray-600 cursor-pointer hover:text-gray-900"
            >
              About
            </span>
            <span
              onClick={() => setShowTermsModal(true)}
              className="text-sm text-gray-600 cursor-pointer hover:text-gray-900"
            >
              Terms
            </span>
            <span
              onClick={() => setShowPrivacyModal(true)}
              className="text-sm text-gray-600 cursor-pointer hover:text-gray-900"
            >
              Privacy
            </span>
          </div>
        </div>
      </footer>

      <Modal
        isOpen={showAboutModal}
        onRequestClose={() => setShowAboutModal(false)}
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
          <button
            onClick={() => setShowAboutModal(false)}
            className="absolute top-4 right-4 text-gray-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">About DayChart</h2>
          </div>

          <div className="space-y-6">
            <p className="text-gray-700 leading-relaxed">
              DayChart is a free, open-source visual time tracking application. Plan your day with interactive circular and linear timelines, manage multiple schedules, and take control of your time.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Features</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Flexible circular and linear timeline views</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Drag to create time blocks instantly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Manage multiple schedules for different purposes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Export schedules as JSON or CSV</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">✓</span>
                  <span>Secure cloud sync across all your devices</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                Open Source
              </span>

              <a
                href="https://github.com/omarraf/time-tracker"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View on GitHub
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            <div className="pt-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Built with React, TypeScript, Firebase, and Tailwind CSS
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Created by{' '}
                <a
                  href="https://github.com/omarraf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-medium"
                >
                  @omarraf
                </a>
              </p>
            </div>
          </div>
        </div>
      </Modal>

      {/* Terms Modal */}
      <Modal
        isOpen={showTermsModal}
        onRequestClose={() => setShowTermsModal(false)}
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
          <button
            onClick={() => setShowTermsModal(false)}
            className="absolute top-4 right-4 text-gray-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h2>
          </div>

          <div className="space-y-6 text-gray-700">
            <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h3>
              <p className="text-sm leading-relaxed">
                By accessing and using DayChart, you accept and agree to be bound by the terms and conditions of this agreement. If you do not agree to these terms, please do not use this service.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">2. Use License</h3>
              <p className="text-sm leading-relaxed">
                DayChart is provided free of charge for personal and commercial use. This is an open-source application, and you may use, modify, and distribute it in accordance with the project's license.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">3. User Accounts</h3>
              <p className="text-sm leading-relaxed">
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">4. Service Availability</h3>
              <p className="text-sm leading-relaxed">
                We strive to provide continuous service availability but do not guarantee that DayChart will be available at all times. We reserve the right to modify or discontinue the service with or without notice.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">5. Limitation of Liability</h3>
              <p className="text-sm leading-relaxed">
                DayChart is provided "as is" without any warranties. We are not liable for any damages arising from your use or inability to use the service.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">6. Contact</h3>
              <p className="text-sm leading-relaxed">
                For questions about these Terms of Service, please contact us through our{' '}
                <a
                  href="https://github.com/omarraf/time-tracker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub repository
                </a>.
              </p>
            </section>
          </div>
        </div>
      </Modal>

      {/* Privacy Modal */}
      <Modal
        isOpen={showPrivacyModal}
        onRequestClose={() => setShowPrivacyModal(false)}
        className="fixed inset-0 flex items-center justify-center p-4 z-50"
        overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
          <button
            onClick={() => setShowPrivacyModal(false)}
            className="absolute top-4 right-4 text-gray-400 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h2>
          </div>

          <div className="space-y-6 text-gray-700">
            <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">1. Your Data is Private</h3>
              <p className="text-sm leading-relaxed">
                <strong>We do not access, view, or use your data.</strong> All schedules and time blocks you create are stored in your personal Firebase account and are only accessible to you.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">2. Data Storage</h3>
              <p className="text-sm leading-relaxed">
                Your data is stored securely in Firebase (Google's cloud infrastructure) and is protected by Firebase's security rules. Only you can access your data through your authenticated account.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">3. No Data Sharing</h3>
              <p className="text-sm leading-relaxed">
                We do not collect, sell, trade, or share any of your personal information or schedule data with anyone. Your information stays with you only.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">4. Your Control</h3>
              <p className="text-sm leading-relaxed mb-2">
                You have full control over your data:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>Export your schedules at any time (JSON or CSV)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">•</span>
                  <span>Delete your schedules whenever you want</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">5. Contact</h3>
              <p className="text-sm leading-relaxed">
                Questions about privacy? Reach out through our{' '}
                <a
                  href="https://github.com/omarraf/time-tracker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub repository
                </a>.
              </p>
            </section>
          </div>
        </div>
      </Modal>
    </>
  );
}
