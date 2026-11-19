package com.example.english_project

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.speech.RecognizerIntent
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var speechResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "smalltalk/speech")
            .setMethodCallHandler { call, result ->
                when {
                    call.method != "recognize" -> result.notImplemented()
                    speechResult != null -> result.success(null)
                    else -> {
                        speechResult = result
                        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
                            .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
                        try {
                            startActivityForResult(intent, 501)
                        } catch (_: ActivityNotFoundException) {
                            speechResult = null
                            result.success(null)
                        }
                    }
                }
            }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 501) return
        val transcript = if (resultCode == Activity.RESULT_OK) {
            data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
        } else null
        speechResult?.success(transcript)
        speechResult = null
    }
}
