import React from 'react';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-xl shadow border border-gray-100">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Terms & Conditions</h1>
        <p className="text-gray-500 mb-8 pb-4 border-b">Last Updated: Version 1.0 (Today)</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Plain English Guarantee</h2>
            <p>We believe legal documents shouldn't require a law degree to understand. These terms represent our binding agreement with you, written as clearly and transparently as possible.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Platform Rules</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Be Honest:</strong> Agents must disclose all known property defects. Lying on a defect disclosure will result in a permanent ban.</li>
              <li><strong>Be Respectful:</strong> No harassment, spam, or abusive language is permitted in live chats or reviews.</li>
              <li><strong>Keep it Clean:</strong> We do not allow listings for illicit businesses, casinos, or properties that violate local laws.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Payments and Refunds</h2>
            <p>If you purchase a premium service (like a featured listing or legal verification), we operate with a strict no-hidden-fees policy. You are entitled to a <strong>full refund within 7 days</strong> of purchase if you are unsatisfied with the service. We will never auto-renew your subscription without your explicit confirmation.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Dispute Resolution</h2>
            <p>If a buyer and an agent have a disagreement (e.g., undisclosed defects or unreturned holding deposits), either party may click the "Raise Dispute" button. Our Admin team will review chat logs, uploaded documents, and defect disclosures to issue a fair, binding resolution.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Account Suspensions</h2>
            <p>We reserve the right to suspend or permanently ban any user—Buyer or Agent—who violates our Ethical Business Code, harasses other users, or attempts to manipulate platform pricing and reviews.</p>
          </section>

          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 mt-8">
            <h3 className="font-bold text-blue-900 mb-2">Questions about these terms?</h3>
            <p className="text-blue-800 text-sm">Our legal team is here to help. Contact us at <a href="mailto:legal@ethicalestates.com" className="underline font-semibold">legal@ethicalestates.com</a>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}