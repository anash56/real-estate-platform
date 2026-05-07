import React from 'react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-xl shadow border border-gray-100">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 mb-8 pb-4 border-b">Last Updated: Version 1.0 (Today)</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. We DO NOT Sell Your Data</h2>
            <p>Unlike traditional real estate portals, we will <strong>never</strong> sell your phone number, email address, or search history to third-party telemarketers, banks, or ad networks. Your data belongs to you.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Radical Buyer Privacy</h2>
            <p>When you send an inquiry to an agent, <strong>your phone number and email are hidden</strong> by default. The agent can only reply to you through our secure in-app Live Chat. You retain complete control over when—and if—you want to reveal your direct contact info by clicking "Reveal My Contact Info" in your dashboard.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Data Collection</h2>
            <p>We only collect the data absolutely necessary to run the platform:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Basic Profile Info (Name, Email, encrypted Password)</li>
              <li>Government IDs (For Agent KYC verification only, stored securely)</li>
              <li>Chat Logs (Used exclusively for Dispute Resolution and Moderation)</li>
              <li>Saved Search Alerts and Favorite Properties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Your Right to be Forgotten</h2>
            <p>Under GDPR and best privacy practices, you have the right to request a complete deletion of your account. Deleting your account will scrub your personal data, chat history, and saved properties from our servers entirely.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Security</h2>
            <p>All sensitive information, including passwords and chat logs, are encrypted in our databases. We use secure WebSockets for real-time chat and heavily rate-limit our APIs to prevent data scraping.</p>
          </section>
        </div>
      </div>
    </div>
  );
}