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
            "approved" -> R.color.present_bg to R.color.present_text
            "rejected" -> R.color.absent_bg to R.color.absent_text
            else       -> R.color.pending_bg to R.color.pending_text
        }
        val ctx = holder.itemView.context
        holder.tvStatus.setBackgroundResource(bgColor)
        holder.tvStatus.setTextColor(androidx.core.content.ContextCompat.getColor(ctx, textColor))

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
