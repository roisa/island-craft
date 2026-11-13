import Foundation
import Capacitor
import StoreKit

/// The one-time "Full BabyMo Craft" unlock, with Apple's StoreKit 2.
/// No outside service: Apple handles the payment and keeps the receipt,
/// so the app still collects no data.
///   product({id}) -> {price}          the price in the shopper's currency
///   buy({id})     -> {owned, pending} pending: waiting for Ask to Buy
///   restore({id}) -> {owned}          after a reinstall or on a new device
///   owned({id})   -> {owned}
/// and an "owned" event when a purchase arrives later (an Ask to Buy approval).
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "product", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "buy", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "owned", returnType: CAPPluginReturnPromise),
    ]
    private var updates: Task<Void, Never>?

    override public func load() {
        // purchases that finish outside the buy() call: Ask to Buy approved by a parent, or bought on another device
        updates = Task.detached { [weak self] in
            for await result in Transaction.updates {
                guard case .verified(let t) = result else { continue }
                await t.finish()
                // kept until the game listens, so an approval that arrives during start-up is not lost
                self?.notifyListeners("owned", data: ["id": t.productID, "owned": t.revocationDate == nil], retainUntilConsumed: true)
            }
        }
    }
    deinit { updates?.cancel() }

    private static func isOwned(_ id: String) async -> Bool {
        for await result in Transaction.currentEntitlements {
            if case .verified(let t) = result, t.productID == id, t.revocationDate == nil { return true }
        }
        return false
    }

    @objc func product(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("Missing id"); return }
        Task {
            do {
                if let p = try await Product.products(for: [id]).first { call.resolve(["price": p.displayPrice]) }
                else { call.resolve([:]) }
            } catch { call.reject(error.localizedDescription) }
        }
    }

    @objc func buy(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("Missing id"); return }
        Task {
            do {
                guard let p = try await Product.products(for: [id]).first else { call.reject("Product not found"); return }
                switch try await p.purchase() {
                case .success(let verification):
                    if case .verified(let t) = verification { await t.finish(); call.resolve(["owned": true]) }
                    else { call.resolve(["owned": false, "unverified": true]) } // Apple could not verify it: say so
                case .pending: call.resolve(["owned": false, "pending": true])
                case .userCancelled: call.resolve(["owned": false])
                @unknown default: call.resolve(["owned": false])
                }
            } catch { call.reject(error.localizedDescription) }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("Missing id"); return }
        Task {
            try? await AppStore.sync()
            call.resolve(["owned": await Self.isOwned(id)])
        }
    }

    @objc func owned(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("Missing id"); return }
        Task { call.resolve(["owned": await Self.isOwned(id)]) }
    }
}
