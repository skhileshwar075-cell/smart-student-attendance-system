package com.smartattend.ui.teacher

import android.graphics.Color
import android.os.CountDownTimer
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.databinding.ItemActiveSessionBinding
import com.smartattend.domain.model.AttendanceSession
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class ActiveSessionsAdapter(
    private val onStopClick: (AttendanceSession) -> Unit,
    private val onSessionExpired: ((AttendanceSession) -> Unit)? = null
) : ListAdapter<AttendanceSession, ActiveSessionsAdapter.ViewHolder>(DIFF) {

    // Keeps track of active timers so they can be cancelled on recycle
    private val timers = mutableMapOf<String, CountDownTimer>()

    inner class ViewHolder(val binding: ItemActiveSessionBinding) :
        RecyclerView.ViewHolder(binding.root) {

        private var timer: CountDownTimer? = null
        private var boundSessionId: String? = null

        fun bind(session: AttendanceSession) {
            boundSessionId = session.id
            cancelTimer()

            // ── Static fields ────────────────────────────────────────────────
            binding.tvSubjectName.text = session.subjectName ?: "Unknown Subject"
            binding.tvSubjectCode.text = session.subjectCode ?: ""
            binding.tvClassName.text = buildString {
                append(session.className ?: "—")
                if (!session.classSection.isNullOrBlank()) append(" · ${session.classSection}")
            }
            binding.tvSessionType.text = session.sessionType.replaceFirstChar { it.uppercase() }
            binding.tvCode.text = when {
                !session.code.isNullOrBlank() -> session.code
                else -> "—"
            }

            // ── Compute initial status ───────────────────────────────────────
            val displayStatus = resolveStatus(session)
            applyStatus(displayStatus)

            // ── Start live countdown or show static label ────────────────────
            val remainingMs = getRemainingMs(session.expiresAt)
            if (displayStatus == "active" && remainingMs > 0) {
                startTimer(session, remainingMs)
            } else {
                binding.tvTimer.text = if (remainingMs <= 0) "Expired" else formatMs(remainingMs)
                binding.tvTimer.setTextColor(Color.parseColor("#9E9E9E"))
            }

            // ── Stop button ──────────────────────────────────────────────────
            val canStop = displayStatus == "active"
            binding.btnStop.visibility = if (canStop) View.VISIBLE else View.GONE
            binding.btnStop.setOnClickListener { onStopClick(session) }
        }

        private fun startTimer(session: AttendanceSession, initialMs: Long) {
            timer = object : CountDownTimer(initialMs, 1000L) {
                override fun onTick(remaining: Long) {
                    if (!isViewAttached()) { cancel(); return }
                    binding.tvTimer.text = formatMs(remaining)
                    // Colour shifts to orange in last 2 minutes
                    binding.tvTimer.setTextColor(
                        if (remaining < 120_000L) Color.parseColor("#E65100")
                        else Color.parseColor("#388E3C")
                    )
                }

                override fun onFinish() {
                    if (!isViewAttached()) return
                    binding.tvTimer.text = "Expired"
                    binding.tvTimer.setTextColor(Color.parseColor("#9E9E9E"))
                    applyStatus("expired")
                    binding.btnStop.visibility = View.GONE
                    onSessionExpired?.invoke(session)
                }
            }.start()
            timers[session.id] = timer!!
        }

        fun cancelTimer() {
            timer?.cancel()
            timer = null
            boundSessionId?.let { timers.remove(it) }
        }

        private fun isViewAttached(): Boolean = binding.root.isAttachedToWindow

        private fun applyStatus(status: String) {
            val (label, bg) = when (status) {
                "active"  -> "ACTIVE"  to "#4CAF50"
                "expired" -> "EXPIRED" to "#FF9800"
                else      -> "STOPPED" to "#9E9E9E"
            }
            binding.tvStatus.text = label
            binding.tvStatus.setBackgroundColor(Color.parseColor(bg))
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemActiveSessionBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    override fun onViewRecycled(holder: ViewHolder) {
        super.onViewRecycled(holder)
        holder.cancelTimer()
    }

    override fun onDetachedFromRecyclerView(recyclerView: RecyclerView) {
        super.onDetachedFromRecyclerView(recyclerView)
        cancelAllTimers()
    }

    fun cancelAllTimers() {
        timers.values.forEach { it.cancel() }
        timers.clear()
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun resolveStatus(session: AttendanceSession): String {
        if (!session.isActive) return "stopped"
        return if (getRemainingMs(session.expiresAt) <= 0) "expired" else "active"
    }

    private fun getRemainingMs(expiresAt: String): Long {
        return try {
            parseExpiry(expiresAt).let { it.time - Date().time }
        } catch (e: Exception) {
            0L
        }
    }

    private fun parseExpiry(expiresAt: String): Date {
        // Try multiple timestamp formats returned by Postgres / ISO-8601
        val formats = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd HH:mm:ss"
        )
        for (fmt in formats) {
            try {
                val sdf = SimpleDateFormat(fmt, Locale.getDefault())
                sdf.timeZone = TimeZone.getTimeZone("UTC")
                val parsed = sdf.parse(expiresAt)
                if (parsed != null) return parsed
            } catch (_: Exception) {}
        }
        return Date(0) // Safe fallback to epoch if parsing fails
    }

    private fun formatMs(ms: Long): String {
        val totalSec = ms / 1000
        val mins = totalSec / 60
        val secs = totalSec % 60
        return "%dm %02ds".format(mins, secs)
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<AttendanceSession>() {
            override fun areItemsTheSame(a: AttendanceSession, b: AttendanceSession) =
                a.id == b.id
            override fun areContentsTheSame(a: AttendanceSession, b: AttendanceSession) =
                a == b
        }
    }
}
