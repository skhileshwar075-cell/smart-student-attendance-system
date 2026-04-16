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
import com.smartattend.domain.model.AttendanceRequest

class StudentRequestsAdapter : ListAdapter<AttendanceRequest, StudentRequestsAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvSubject: TextView = view.findViewById(R.id.tvSubject)
        val tvDate: TextView = view.findViewById(R.id.tvDate)
        val tvReason: TextView = view.findViewById(R.id.tvReason)
        val tvStatus: TextView = view.findViewById(R.id.tvStatus)
        val tvNote: TextView = view.findViewById(R.id.tvNote)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_student_request, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        holder.tvSubject.text = item.subjectName ?: "Unknown Subject"
        holder.tvDate.text = item.date
        holder.tvReason.text = item.reason
        holder.tvStatus.text = item.status.replaceFirstChar { it.uppercase() }

        val (bgColor, textColor) = when (item.status.lowercase()) {
            "approved" -> "#DCFCE7" to "#166534"
            "rejected" -> "#FEE2E2" to "#991B1B"
            else       -> "#FEF3C7" to "#92400E"
        }
        holder.tvStatus.setBackgroundColor(Color.parseColor(bgColor))
        holder.tvStatus.setTextColor(Color.parseColor(textColor))

        if (!item.teacherNote.isNullOrBlank()) {
            holder.tvNote.visibility = View.VISIBLE
            holder.tvNote.text = "Note: ${item.teacherNote}"
        } else {
            holder.tvNote.visibility = View.GONE
        }
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<AttendanceRequest>() {
            override fun areItemsTheSame(a: AttendanceRequest, b: AttendanceRequest) = a.id == b.id
            override fun areContentsTheSame(a: AttendanceRequest, b: AttendanceRequest) = a == b
        }
    }
}
