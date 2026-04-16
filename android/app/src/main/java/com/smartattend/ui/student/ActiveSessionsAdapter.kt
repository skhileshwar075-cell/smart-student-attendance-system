package com.smartattend.ui.student

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.databinding.ItemStudentSessionBinding
import com.smartattend.domain.model.AttendanceSession
import java.text.SimpleDateFormat
import java.util.*

class ActiveSessionsAdapter(
    private val onSelect: (AttendanceSession) -> Unit
) : ListAdapter<AttendanceSession, ActiveSessionsAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(private val binding: ItemStudentSessionBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(session: AttendanceSession) {
            binding.tvSubjectName.text = session.subjectName ?: "Unknown Subject"
            binding.tvClassName.text = session.className ?: ""
            binding.tvTeacherName.text = "By: ${session.teacherName ?: "Teacher"}"
            binding.tvSessionType.text = session.sessionType.uppercase()
            binding.tvCode.text = session.code ?: "—"
            binding.tvGeoFence.text = if (session.geoLat != null) "📍 Geo-fenced (${session.geoRadius}m)" else "No geo-fence"

            val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
            try {
                val expires = sdf.parse(session.expiresAt)
                val diff = expires?.time?.minus(System.currentTimeMillis()) ?: 0
                val mins = diff / 60000
                val secs = (diff % 60000) / 1000
                binding.tvTimeLeft.text = if (diff > 0) "${mins}m ${secs}s left" else "Expired"
            } catch (e: Exception) {
                binding.tvTimeLeft.text = session.expiresAt
            }

            binding.root.setOnClickListener { onSelect(session) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        ViewHolder(ItemStudentSessionBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    companion object DiffCallback : DiffUtil.ItemCallback<AttendanceSession>() {
        override fun areItemsTheSame(a: AttendanceSession, b: AttendanceSession) = a.id == b.id
        override fun areContentsTheSame(a: AttendanceSession, b: AttendanceSession) = a == b
    }
}
