package fr.maisoncpr.rami;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ServiceWorkerController;

/* Le jeu tourne dans l'appli (son propre moteur web, pas Chrome) : les sauvegardes restent dans les données de l'appli,
   sans aucun lien avec Chrome. Le jeu se met à jour tout seul depuis son adresse, et marche ensuite sans internet. */
public class MainActivity extends Activity {
    private static final String JEU = "https://manuelbotelho37-commits.github.io/cap-du-jour/le-rami/";
    private static final String HOTE = "manuelbotelho37-commits.github.io";
    private WebView web;

    public class Pont {
        @JavascriptInterface
        public void openUrl(String url) {
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) {}
            });
        }
    }

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0C0C0E);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        try { ServiceWorkerController.getInstance().getServiceWorkerWebSettings().setAllowContentAccess(true); } catch (Exception ignored) {}
        s.setMediaPlaybackRequiresUserGesture(false);
        web.addJavascriptInterface(new Pont(), "RamiApp");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOTE.equals(u.getHost()) && u.getPath() != null && u.getPath().startsWith("/cap-du-jour/le-rami")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
        });
        setContentView(web);
        web.loadUrl(JEU);
    }

    private void sauver() {
        if (web != null) web.evaluateJavascript("try{save()}catch(e){}", null);
    }

    @Override
    protected void onPause() { sauver(); super.onPause(); }

    @Override
    protected void onStop() { sauver(); super.onStop(); }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript(
            "(function(){var d=document.getElementById('drawer'),m=document.getElementById('modal');" +
            "if(d&&!d.classList.contains('hidden')){d.classList.add('hidden');return 1}" +
            "return 0})()",
            v -> { if (!"1".equals(v)) moveTaskToBack(true); });
    }
}
