package com.smartattend.ui.admin

import android.graphics.Color
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.R
import com.smartattend.domain.model.AttendanceRecord

class AdminAttendanceReportAdapter : ListAdapter<AttendanceRecord, AdminAttendanceReportAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvStudentName: TextView = view.findViewById(R.id.tvStudentName)
        val tvDetails: TextView = view.findViewById(R.id.tvDetails)
        val tvDate: TextView = view.findViewById(R.id.tvDate)
        val tvStatus: TextView = view.findViewById(R.id.tvStatus)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_admin_attendance_record, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        holder.tvStudentName.text = item.studentName ?: "—"
        val subjectInfo = listOfNotNull(item.subjectName, item.subjectCode).joinToString(" • ")
        holder.tvDetails.text = subjectInfo.ifBlank { "—" }
        holder.tvDate.text = item.date
        holder.tvStatus.text = item.status.replaceFirstChar { it.uppercase() }

        val (bgColor, textColor) = when (item.status.lowercase()) {
            "present" -> R.color.present_bg to R.color.present_text
            "absent" -> R.color.absent_bg to R.color.absent_text
            "late" -> R.color.late_bg to R.color.late_text
            else -> R.color.gray_100 to R.color.gray_700
        }
        val ctx = holder.itemView.context
        holder.tvStatus.setBackgroundResource(bgColor)
        holder.tvStatus.setTextColor(androidx.core.content.ContextCompat.getColor(ctx, textColor))
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<AttendanceRecord>() {
            override fun areItemsTheSame(a: AttendanceRecord, b: AttendanceRecord) = a.id == b.id
            override fun areContentsTheSame(a: AttendanceRecord, b: AttendanceRecord) = a == b
        }
    }
}
