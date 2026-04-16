package com.smartattend.ui.student

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

class AttendanceHistoryAdapter : ListAdapter<AttendanceRecord, AttendanceHistoryAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvDate: TextView = view.findViewById(R.id.tvDate)
        val tvSubject: TextView = view.findViewById(R.id.tvSubject)
        val tvStatus: TextView = view.findViewById(R.id.tvStatus)
        val tvMethod: TextView = view.findViewById(R.id.tvMethod)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_attendance_record, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        holder.tvDate.text = item.date
        holder.tvSubject.text = item.subjectName ?: "—"
        holder.tvStatus.text = item.status.replaceFirstChar { it.uppercase() }
        holder.tvMethod.text = item.method?.uppercase() ?: "—"

        val (bgColor, textColor) = when (item.status.lowercase()) {
            "present" -> "#DCFCE7" to "#166534"
            "absent"  -> "#FEE2E2" to "#991B1B"
            "late"    -> "#FEF9C3" to "#713F12"
            else      -> "#F3F4F6" to "#374151"
        }
        val ctx = holder.itemView.context
        holder.tvStatus.setBackgroundColor(Color.parseColor(bgColor))
        holder.tvStatus.setTextColor(Color.parseColor(textColor))
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<AttendanceRecord>() {
            override fun areItemsTheSame(a: AttendanceRecord, b: AttendanceRecord) = a.id == b.id
            override fun areContentsTheSame(a: AttendanceRecord, b: AttendanceRecord) = a == b
        }
    }
}
