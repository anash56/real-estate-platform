import React from 'react';

export default function EthicalCode() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-xl shadow border border-gray-100">
        <h1 className="text-4xl font-extrabold text-blue-600 mb-2">Ethical Business Code</h1>
        <p className="text-gray-500 mb-8 pb-4 border-b">The foundation of our Trust & Safety ecosystem.</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section className="bg-orange-50 border border-orange-200 p-6 rounded-xl text-orange-900 mb-8">
            <h2 className="text-xl font-bold mb-2">Why this exists</h2>
            <p>The real estate industry has historically struggled with trust. Fake listings, hidden defects, and manipulated prices hurt everyone. This Ethical Business Code is a mandatory agreement for all Agents and Buyers on our platform to ensure radical transparency.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Mandatory Defect Disclosures</h2>
            <p>Agents are legally required to fill out a Defect Disclosure form before publishing a listing. You must truthfully disclose:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Known structural issues (seepage, foundation cracks)</li>
              <li>Pending legal disputes or title conflicts</li>
              <li>Previous major damage or unpermitted repairs</li>
            </ul>
            <p className="mt-2 text-sm text-red-600 font-bold">Penalty: Hiding defects will result in the property being removed and potential account suspension.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Price Transparency</h2>
            <p>We believe fake "price drops" to create artificial urgency are unethical. Our platform publicly records and displays every single price change on a property's page. Agents may not artificially inflate a price just to discount it days later.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Verified Reviews Only</h2>
            <p>Agents may not purchase or incentivize positive reviews, nor may they suppress negative reviews. Buyers may only leave a review if they have verifiably interacted with the agent through our platform. All genuine reviews—both positive and negative—will remain public.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. No Discriminatory Practices</h2>
            <p>Agents and sellers may not discriminate against potential buyers or renters based on race, religion, gender, marital status, or dietary preferences. Discrimination reported to our Dispute team will result in an immediate and permanent ban.</p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Genuine Media</h2>
            <p>Property images must accurately represent the current state of the home. Using heavily filtered photos to hide defects or uploading renders without explicitly labeling them as "Conceptual" is prohibited.</p>
          </section>
        </div>
      </div>
    </div>
  );
}