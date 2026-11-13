import UIKit
import Capacitor

/// The app's web view, with the app's own plugins registered (the StoreKit unlock).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(StoreKitPlugin())
    }
}
